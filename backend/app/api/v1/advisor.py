"""AI Financial Advisor chat endpoint — persona-driven with RAG context."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import call_llm, stream_llm
from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.user import User
from app.schemas.advisor import ChatRequest, ChatResponse
from app.services.advisor_service import (
    build_chat_prompt,
    get_valid_personas,
)
from app.services.analytics_service import build_user_financial_summary
from app.services.rag_service import query_knowledge_base

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/advisor", tags=["advisor"])


# ── SSE event generator (for streaming mode) ─────────────────────────────

async def _sse_generator(
    system_prompt: str,
    user_prompt: str,
    persona: str,
    sources: list[str],
) -> AsyncGenerator[str, None]:
    """Yield SSE-encoded events for streaming mode."""
    # 1. Open event — includes metadata
    yield f"data: {json.dumps({'type': 'start', 'persona': persona, 'sources': sources})}\n\n"

    # 2. Text chunks
    full_reply: list[str] = []
    async for chunk in stream_llm(system_prompt, user_prompt, max_tokens=4096):
        full_reply.append(chunk)
        yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

    # 3. Done event
    yield f"data: {json.dumps({'type': 'done', 'reply': ''.join(full_reply)})}\n\n"


# ── Endpoint ─────────────────────────────────────────────────────────────

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
    valid = get_valid_personas()
    if body.persona not in valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid persona '{body.persona}'. Valid options: {', '.join(valid)}",
        )

    # Step 1: Build user financial summary
    user_summary = await build_user_financial_summary(current_user, session)

    # Step 2: RAG retrieval
    rag_chunks = await asyncio.to_thread(query_knowledge_base, body.message, 3)
    rag_context = "\n\n".join(rag_chunks) if rag_chunks else ""

    # Step 3: Assemble prompt
    system_prompt, user_prompt = build_chat_prompt(
        persona=body.persona,
        user_message=body.message,
        user_summary=user_summary,
        rag_context=rag_context,
    )

    # Step 4a: Streaming
    if stream:
        return StreamingResponse(
            _sse_generator(system_prompt, user_prompt, body.persona, rag_chunks),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    # Step 4b: Non-streaming
    reply_text, success = await call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=4096,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=reply_text,
        )

    return ChatResponse(
        reply=reply_text,
        persona=body.persona,
        sources=rag_chunks,
    )
