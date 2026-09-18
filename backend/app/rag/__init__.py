"""Retrieval-augmented generation package.

Public surface:

``get_knowledge_base()``
    The lazily built :class:`~app.rag.knowledge_base.KnowledgeBase` singleton.
``retrieve``/``retrieve_texts``
    Similarity search over the finance knowledge base.
``build_rag_chain``/``answer_with_rag``
    LangChain Expression Language chain wiring retrieval into the LLM.
"""

from app.rag.chain import answer_with_rag, build_rag_chain
from app.rag.knowledge_base import (
    KnowledgeBase,
    get_knowledge_base,
    index_texts,
    rag_status,
    reset_knowledge_base,
    retrieve,
    retrieve_texts,
)

__all__ = [
    "KnowledgeBase",
    "answer_with_rag",
    "build_rag_chain",
    "get_knowledge_base",
    "index_texts",
    "rag_status",
    "reset_knowledge_base",
    "retrieve",
    "retrieve_texts",
]
