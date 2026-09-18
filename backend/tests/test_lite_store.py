"""Tests for the BM25 backend and the memory-aware backend selection."""

import pathlib

import pytest

from app.rag import runtime
from app.rag.lite_store import BM25Store, tokenize
from app.rag.runtime import MIN_BYTES_FOR_CHROMA, select_backend


# ── Tokenisation ─────────────────────────────────────────────────────────

def test_tokenizer_keeps_section_numbers_intact():
    tokens = tokenize("Deduction under Section 80C and 80CCD(1B)")

    assert "80c" in tokens
    assert "80ccd(1b)" in tokens
    # Stopwords and single characters are dropped.
    assert "and" not in tokens
    assert "under" not in tokens


def test_tokenizer_keeps_currency_and_percentages():
    tokens = tokenize("₹1,50,000 at 30% slab")

    assert any("₹" in t for t in tokens)
    assert any("30%" == t or t.startswith("30") for t in tokens)


# ── Indexing ─────────────────────────────────────────────────────────────

@pytest.fixture
def store():
    store = BM25Store()
    store.add_texts(
        [
            "Section 80C allows deductions up to 1.5 lakh for ELSS, PPF and EPF.",
            "An economic moat is a durable competitive advantage that keeps rivals out.",
            "An emergency fund should cover three to six months of essential expenses.",
            "Employer NPS contributions under 80CCD(2) remain deductible in the new regime.",
        ],
        [
            {"source": "80C", "persona": "indian_finance", "section": "Limits"},
            {"source": "Moats", "persona": "warren_buffett", "section": "Moats"},
            {"source": "Budgeting", "persona": "all", "section": "Emergency fund"},
            {"source": "NPS", "persona": "indian_finance", "section": "80CCD(2)"},
        ],
    )
    return store


def test_index_counts_documents(store):
    assert store.count() == 4


def test_indexing_the_same_content_twice_is_a_no_op(store):
    before = store.count()
    added = store.add_texts(
        ["Section 80C allows deductions up to 1.5 lakh for ELSS, PPF and EPF."],
        [{"source": "80C"}],
    )

    assert added == []
    assert store.count() == before


def test_empty_and_blank_texts_are_skipped():
    store = BM25Store()
    assert store.add_texts(["", "   ", "\n"]) == []
    assert store.count() == 0


# ── Ranking ──────────────────────────────────────────────────────────────

def test_search_ranks_the_relevant_chunk_first(store):
    results = store.search("how much can I claim under 80C", k=3)

    assert results
    assert "80C" in results[0][0].page_content
    assert results[0][1] == pytest.approx(1.0)


def test_search_matches_specific_vocabulary(store):
    results = store.search("what is an economic moat", k=2)
    assert "moat" in results[0][0].page_content.lower()

    results = store.search("how many months of expenses should I keep saved", k=2)
    assert "emergency fund" in results[0][0].page_content.lower()


def test_scores_are_normalised_and_descending(store):
    results = store.search("80C deduction ELSS PPF", k=4)

    scores = [score for _, score in results]
    assert scores == sorted(scores, reverse=True)
    assert all(0.0 <= s <= 1.0 for s in scores)


def test_search_returns_nothing_for_an_unrelated_query(store):
    assert store.search("photosynthesis in tropical ferns", k=3) == []


def test_search_returns_nothing_for_stopwords_only(store):
    assert store.search("what is the of and", k=3) == []


def test_empty_index_returns_nothing():
    assert BM25Store().search("anything", k=3) == []


def test_k_limits_the_result_count(store):
    assert len(store.search("deduction regime fund moat", k=2)) <= 2


# ── Persona handling ─────────────────────────────────────────────────────

def test_persona_boost_lifts_matching_material(store):
    neutral = store.search("deduction", k=4)
    boosted = store.search("deduction", k=4, persona="indian_finance", persona_boost=0.5)

    assert boosted[0][0].metadata["persona_match"] is True
    # The boost changes ranking, never membership.
    assert {d.page_content for d, _ in neutral} == {d.page_content for d, _ in boosted}


def test_shared_material_counts_as_a_persona_match(store):
    results = store.search(
        "emergency fund months of expenses",
        k=2,
        persona="warren_buffett",
        persona_boost=0.1,
    )

    assert results[0][0].metadata["persona_match"] is True


def test_metadata_carries_score_and_retrieval_tag(store):
    doc, _ = store.search("80C", k=1)[0]

    assert doc.metadata["retrieval"] == "bm25"
    assert 0.0 <= doc.metadata["score"] <= 1.0
    assert doc.metadata["source"] == "80C"


def test_clear_empties_the_index(store):
    store.clear()
    assert store.count() == 0
    assert store.search("80C", k=3) == []


# ── Backend selection ────────────────────────────────────────────────────

def test_explicit_backend_overrides_detection():
    assert select_backend("chroma")[0] == "chroma"
    assert select_backend("lite")[0] == "lite"
    assert select_backend("bm25")[0] == "lite"


def test_unknown_backend_falls_through_to_auto(caplog):
    backend, _ = select_backend("nonsense")
    assert backend in {"chroma", "lite"}


def test_small_cgroup_limit_selects_lite(tmp_path, monkeypatch):
    limit_file = tmp_path / "memory.max"
    limit_file.write_text("536870912")  # 512 MB, Render's free tier
    monkeypatch.setattr(runtime, "_CGROUP_V2", limit_file)

    backend, reason = select_backend("auto")

    assert backend == "lite"
    assert "512 MB" in reason


def test_large_cgroup_limit_selects_chroma(tmp_path, monkeypatch):
    limit_file = tmp_path / "memory.max"
    limit_file.write_text(str(MIN_BYTES_FOR_CHROMA * 2))
    monkeypatch.setattr(runtime, "_CGROUP_V2", limit_file)

    assert select_backend("auto")[0] == "chroma"


def test_unlimited_cgroup_is_ignored(tmp_path, monkeypatch):
    limit_file = tmp_path / "memory.max"
    limit_file.write_text("max")
    monkeypatch.setattr(runtime, "_CGROUP_V2", limit_file)
    monkeypatch.setattr(runtime, "_CGROUP_V1", tmp_path / "missing")

    # Falls through to system memory rather than reading "max" as a number.
    assert select_backend("auto")[0] in {"chroma", "lite"}


def test_managed_host_without_a_cgroup_limit_selects_lite(tmp_path, monkeypatch):
    """Host RAM on a PaaS says far more than the instance may actually use."""
    monkeypatch.setattr(runtime, "_CGROUP_V2", tmp_path / "missing")
    monkeypatch.setattr(runtime, "_CGROUP_V1", tmp_path / "missing")
    monkeypatch.setenv("RENDER", "true")

    backend, reason = select_backend("auto")

    assert backend == "lite"
    assert "managed host" in reason


def test_managed_host_can_still_be_overridden(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    assert select_backend("chroma")[0] == "chroma"
