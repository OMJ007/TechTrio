"""AI Financial Advisor endpoints — persona-driven, grounded in LangChain RAG."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import stream_llm
from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.user import User
from app.rag import answer_with_rag, rag_status, retrieve
from app.rag.knowledge_base import format_documents
from app.schemas.advisor import (
    ChatRequest,
    ChatResponse,
    KnowledgeStatus,
    RetrievedChunk,
    TaxPlanRequest,
    TaxPlanResponse,
)
from app.services.advisor_service import (
    build_chat_prompt,
    get_persona_prompt,
    get_valid_personas,
)
from app.services.analytics_service import build_user_financial_summary
from app.services.tax_service import build_tax_plan, summarise_for_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/advisor", tags=["advisor"])


def _validate_persona(persona: str) -> str:
    """Return *persona* if recognised, otherwise raise a 400."""
    valid = get_valid_personas()
    if persona not in valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid persona '{persona}'. Valid options: {', '.join(valid)}",
        )
    return persona


def _as_chunks(documents: list[Any]) -> list[RetrievedChunk]:
    """Convert retrieved LangChain documents into API response models."""
    return [
        RetrievedChunk(
            text=doc.page_content,
            source=str(doc.metadata.get("source") or "Finance knowledge"),
            topic=doc.metadata.get("topic"),
            section=doc.metadata.get("section"),
            score=doc.metadata.get("score"),
            persona_match=bool(doc.metadata.get("persona_match", False)),
        )
        for doc in documents
    ]


# ── SSE event generator (for streaming mode) ─────────────────────────────

async def _sse_generator(
    system_prompt: str,
    user_prompt: str,
    persona: str,
    chunks: list[RetrievedChunk],
) -> AsyncGenerator[str, None]:
    """Yield SSE-encoded events for streaming mode."""
    # 1. Open event — includes metadata and the retrieved sources.
    start_event = {
        "type": "start",
        "persona": persona,
        "sources": [chunk.text for chunk in chunks],
        "citations": [chunk.model_dump() for chunk in chunks],
    }
    yield f"data: {json.dumps(start_event)}\n\n"

    # 2. Text chunks
    full_reply: list[str] = []
    async for chunk in stream_llm(system_prompt, user_prompt, max_tokens=4096):
        full_reply.append(chunk)
        yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

    # 3. Done event
    yield f"data: {json.dumps({'type': 'done', 'reply': ''.join(full_reply)})}\n\n"


# ── Chat ─────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    summary="Chat with an AI financial advisor persona",
    response_model=None,  # manual because of streaming
)
async def chat(
    body: ChatRequest,
    stream: bool = Query(
        False,
        description="Set to true to receive a server-sent event stream",
    ),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Send a message to the selected financial advisor persona."""
    persona = _validate_persona(body.persona)

    # Step 1: Build the user's financial summary.
    user_summary = await build_user_financial_summary(current_user, session)

    # Step 2: Persona-aware retrieval. The vector search is synchronous (Chroma
    # plus a local embedding model), so it runs in a worker thread to keep the
    # event loop free.
    documents = await asyncio.to_thread(retrieve, body.message, body.top_k, persona)
    chunks = _as_chunks(documents)

    # Step 3a: Streaming — the SSE transport needs token-level control, so the
    # prompt is assembled here and streamed through the LLM client directly.
    if stream:
        system_prompt, user_prompt = build_chat_prompt(
            persona=persona,
            user_message=body.message,
            user_summary=user_summary,
            rag_context=format_documents(documents),
        )
        return StreamingResponse(
            _sse_generator(system_prompt, user_prompt, persona, chunks),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    # Step 3b: Non-streaming — answered by the LangChain RAG chain.
    try:
        reply_text, sources = await answer_with_rag(
            question=body.message,
            system_prompt=get_persona_prompt(persona),
            profile=user_summary,
            top_k=body.top_k,
            persona=persona,
            documents=documents,
        )
    except Exception as exc:  # noqa: BLE001 - surfaced to the client as 503
        logger.exception("Advisor chain failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc) or "The advisor service is currently unavailable.",
        ) from exc

    return ChatResponse(
        reply=reply_text,
        persona=persona,
        sources=sources,
        citations=chunks,
    )


# ── Tax planning ─────────────────────────────────────────────────────────

_TAX_QUESTION = (
    "Walk me through my tax position for this year. Which regime should I choose "
    "and why, what deduction headroom do I still have, and what are the two or "
    "three specific actions worth taking before the financial year ends? Use the "
    "figures in my tax estimate below and be explicit that they are estimates."
)


@router.post(
    "/tax-plan",
    response_model=TaxPlanResponse,
    summary="Estimate tax under both regimes with a grounded explanation",
)
async def tax_plan(
    body: TaxPlanRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TaxPlanResponse:
    """Compare the old and new regimes and explain the result.

    The numbers are computed from the user's declared income and recorded
    transactions; the explanation is generated by the selected persona with the
    tax documents retrieved from the knowledge base.
    """
    persona = _validate_persona(body.persona)

    plan = await build_tax_plan(
        current_user,
        session,
        annual_income=body.annual_income,
        declared_deductions=body.declared_deductions,
    )
    payload = plan.as_dict()

    explanation = ""
    chunks: list[RetrievedChunk] = []

    if body.explain:
        summary = summarise_for_prompt(plan)
        profile = await build_user_financial_summary(current_user, session)

        documents = await asyncio.to_thread(
            retrieve,
            "income tax regime comparison 80C 80D NPS deductions tax saving",
            6,
            persona,
        )
        chunks = _as_chunks(documents)

        try:
            explanation, _ = await answer_with_rag(
                question=f"{_TAX_QUESTION}\n\n## Tax estimate\n{summary}",
                system_prompt=get_persona_prompt(persona),
                profile=profile,
                persona=persona,
                documents=documents,
            )
        except Exception:  # noqa: BLE001
            # The arithmetic is the deliverable; a failed LLM call degrades the
            # response rather than losing it.
            logger.warning("Tax plan explanation unavailable", exc_info=True)
            explanation = (
                "The numbers below were computed successfully, but the advisor "
                "explanation could not be generated right now. Try again shortly."
            )

    return TaxPlanResponse(**payload, explanation=explanation, citations=chunks)


# ── Knowledge base introspection ─────────────────────────────────────────

@router.get(
    "/knowledge/status",
    response_model=KnowledgeStatus,
    summary="Inspect the retrieval stack backing the advisor",
)
async def knowledge_status(
    _: User = Depends(get_current_user),
) -> KnowledgeStatus:
    """Report which vector store, embedding model, and splitter are in use."""
    return KnowledgeStatus(**await asyncio.to_thread(rag_status))


@router.get(
    "/knowledge/search",
    response_model=list[RetrievedChunk],
    summary="Search the finance knowledge base directly",
)
async def knowledge_search(
    q: str = Query(..., min_length=2, max_length=500, description="Search query"),
    top_k: int = Query(5, ge=1, le=20),
    persona: str | None = Query(
        None,
        description="Bias results toward this persona's material",
    ),
    _: User = Depends(get_current_user),
) -> list[RetrievedChunk]:
    """Run retrieval without generating an answer — useful for debugging RAG."""
    if persona is not None:
        _validate_persona(persona)
    documents = await asyncio.to_thread(retrieve, q, top_k, persona)
    return _as_chunks(documents)
