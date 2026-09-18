"""RAG knowledge retrieval — thin facade over :mod:`app.rag`.

The retrieval stack (splitter, embeddings, Chroma-backed LangChain vector
store, LCEL chain) lives in ``app/rag/``.  This module keeps the original
function names working so existing callers and tests do not have to change.
"""

from __future__ import annotations

from typing import Any, Sequence

from app.rag import (
    answer_with_rag,
    build_rag_chain,
    index_texts,
    rag_status,
    reset_knowledge_base,
    retrieve,
    retrieve_texts,
)
from app.rag.knowledge import KNOWLEDGE_CHUNKS

__all__ = [
    "answer_with_rag",
    "build_rag_chain",
    "index_document",
    "query_knowledge_base",
    "query_knowledge_documents",
    "rag_status",
    "reset_collection",
]


def index_document(
    text_chunks: Sequence[str] | str,
    metadata: dict[str, Any] | None = None,
) -> list[str]:
    """Split, embed, and index *text_chunks*; returns the stored document IDs."""
    return index_texts(text_chunks, metadata)


def query_knowledge_base(query: str, top_k: int = 3) -> list[str]:
    """Return the *top_k* most relevant knowledge chunks as plain strings."""
    return retrieve_texts(query, top_k)


def query_knowledge_documents(query: str, top_k: int = 3) -> list[Any]:
    """Return the *top_k* most relevant chunks as LangChain ``Document`` objects."""
    return retrieve(query, top_k)


def reset_collection() -> None:
    """Delete and re-seed the knowledge collection (used by tests)."""
    reset_knowledge_base()


# Kept for backwards compatibility with code that imported the seed corpus
# from this module before it moved to ``app.rag.knowledge``.
_DEFAULT_KNOWLEDGE_CHUNKS = KNOWLEDGE_CHUNKS
