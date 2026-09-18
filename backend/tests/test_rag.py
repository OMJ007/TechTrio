"""Tests for the LangChain RAG layer.

These exercise chunking, the embedding fallback, keyword degradation, and the
prompt assembly — never the network.  The vector-store tests skip themselves
when chromadb / the embedding model are not installed, so the suite stays
green on a machine that only installed the web dependencies.
"""

import pytest

from app.rag import knowledge_base as kb
from app.rag.chain import RAG_PROMPT_TEMPLATE, retrieve_context
from app.rag.embeddings import HashingEmbeddings
from app.rag.knowledge import KNOWLEDGE_BY_TOPIC, KNOWLEDGE_CHUNKS, iter_chunks
from app.rag.vector_store import Document, content_id
from app.services import rag_service


# ── Seed corpus ──────────────────────────────────────────────────────────

def test_seed_corpus_is_non_empty_and_tagged():
    assert len(KNOWLEDGE_CHUNKS) >= 20
    pairs = iter_chunks()
    assert len(pairs) == len(KNOWLEDGE_CHUNKS)
    assert set(KNOWLEDGE_BY_TOPIC) == {
        "indian_tax",
        "budgeting",
        "value_investing",
        "conscious_spending",
    }
    assert all(topic and text.strip() for topic, text in pairs)


def test_content_ids_are_stable_and_distinct():
    assert content_id("hello") == content_id("hello")
    assert content_id("hello") != content_id("hello ")
    assert content_id("hello", "ns") != content_id("hello")


# ── Embeddings ───────────────────────────────────────────────────────────

def test_hashing_embeddings_are_deterministic_and_normalised():
    embedder = HashingEmbeddings(dimensions=64)
    first = embedder.embed_query("Section 80C tax saving")
    second = embedder.embed_query("Section 80C tax saving")

    assert first == second
    assert len(first) == 64
    assert sum(v * v for v in first) == pytest.approx(1.0, abs=1e-6)


def test_hashing_embeddings_rank_related_text_higher():
    embedder = HashingEmbeddings(dimensions=256)

    def cosine(a, b):
        return sum(x * y for x, y in zip(a, b))

    query = embedder.embed_query("how much can I deduct under section 80C")
    related = embedder.embed_query("Section 80C allows deductions up to 1.5 lakh")
    unrelated = embedder.embed_query("an economic moat protects a business")

    assert cosine(query, related) > cosine(query, unrelated)


def test_embed_documents_matches_embed_query():
    embedder = HashingEmbeddings(dimensions=32)
    assert embedder.embed_documents(["abc"])[0] == embedder.embed_query("abc")


# ── Keyword fallback ─────────────────────────────────────────────────────

def test_keyword_fallback_finds_relevant_chunks():
    results = kb._keyword_search("What is section 80C and ELSS?", top_k=3)
    assert results
    assert any("80C" in doc.page_content for doc in results)
    assert results[0].metadata["retrieval"] == "keyword-fallback"
    assert results[0].metadata["source"]


def test_keyword_fallback_ignores_stopword_only_queries():
    assert kb._keyword_search("what is the", top_k=3) == []


def test_retrieve_returns_nothing_for_an_empty_query():
    assert kb.retrieve("") == []
    assert kb.retrieve("   ") == []


# ── Formatting & prompt ──────────────────────────────────────────────────

def test_format_documents_numbers_and_labels_sources():
    docs = [
        Document(page_content="First fact.", metadata={"source": "Indian Tax"}),
        Document(page_content="Second fact.", metadata={}),
    ]
    rendered = kb.format_documents(docs)

    assert "[1] (Indian Tax) First fact." in rendered
    assert "[2] (Finance knowledge) Second fact." in rendered


def test_prompt_template_renders_every_placeholder():
    rendered = RAG_PROMPT_TEMPLATE.format(
        system_prompt="SYSTEM",
        context="CONTEXT",
        profile="PROFILE",
        question="QUESTION",
    )
    for token in ("SYSTEM", "CONTEXT", "PROFILE", "QUESTION"):
        assert token in rendered
    assert "{" not in rendered


def test_retrieve_context_always_returns_a_string():
    assert isinstance(retrieve_context("tax saving options"), str)
    assert retrieve_context("") == "(no relevant knowledge-base entries were retrieved)"


# ── Back-compat facade ───────────────────────────────────────────────────

def test_rag_service_facade_exposes_the_old_names():
    assert callable(rag_service.query_knowledge_base)
    assert callable(rag_service.index_document)
    assert callable(rag_service.reset_collection)
    assert rag_service.query_knowledge_base("", 3) == []
    assert rag_service.index_document([]) == []


def test_rag_status_reports_the_active_backends():
    status = rag_service.rag_status()
    assert status["vector_store"] in {"chroma", "keyword-fallback"}
    assert status["documents"] >= 0
    assert "embeddings" in status


# ── Vector store (skipped when the optional stack is missing) ────────────

@pytest.fixture(scope="module")
def vector_kb():
    base = kb.get_knowledge_base()
    if not base.available:
        pytest.skip("chromadb / embedding model not installed")
    return base


def test_vector_store_seeds_and_retrieves(vector_kb):
    assert vector_kb.status()["documents"] > 0

    results = vector_kb.retrieve("how do I save tax in India", top_k=3)
    assert results
    assert all(isinstance(doc.page_content, str) for doc in results)
    assert all("score" in doc.metadata for doc in results)


def test_indexing_is_idempotent(vector_kb):
    before = vector_kb.status()["documents"]
    text = "Xpense AI test fact: the household emergency buffer target is six months."

    first = vector_kb.index([text], {"origin": "test"})
    after_first = vector_kb.status()["documents"]
    second = vector_kb.index([text], {"origin": "test"})

    assert first == second  # identical content -> identical IDs
    assert vector_kb.status()["documents"] == after_first
    assert after_first >= before
