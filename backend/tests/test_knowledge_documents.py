"""Tests for the markdown knowledge documents and persona-aware retrieval."""

import pytest

from app.rag import knowledge_base as kb
from app.rag.doc_loader import (
    DOCUMENTS_DIR,
    SHARED_PERSONA,
    iter_document_chunks,
    load_document,
    load_documents,
    split_into_sections,
)
from app.rag.vector_store import Document
from app.services.advisor_service import get_valid_personas

VALID_PERSONAS = set(get_valid_personas()) | {SHARED_PERSONA}


# ── Frontmatter parsing ──────────────────────────────────────────────────

def test_frontmatter_parses_scalars_and_inline_lists(tmp_path):
    path = tmp_path / "sample.md"
    path.write_text(
        "---\n"
        "title: A Sample Document\n"
        "topic: indian_tax\n"
        "persona: indian_finance\n"
        "tags: [80C, ELSS, PPF]\n"
        "as_of: 2026-09-18\n"
        "---\n"
        "\n## First\n\nBody text.\n",
        encoding="utf-8",
    )

    document = load_document(path)

    assert document.title == "A Sample Document"
    assert document.topic == "indian_tax"
    assert document.persona == "indian_finance"
    assert document.tags == ["80C", "ELSS", "PPF"]
    assert document.as_of == "2026-09-18"
    assert document.body.startswith("## First")


def test_document_without_frontmatter_gets_defaults(tmp_path):
    path = tmp_path / "no-frontmatter.md"
    path.write_text("## Heading\n\nSome text.\n", encoding="utf-8")

    document = load_document(path)

    assert document.persona == SHARED_PERSONA
    assert document.topic == "general"
    assert document.title == "No Frontmatter"


def test_metadata_values_are_chroma_safe_scalars(tmp_path):
    path = tmp_path / "doc.md"
    path.write_text(
        "---\ntitle: T\ntopic: x\npersona: all\ntags: [a, b]\n---\nBody\n",
        encoding="utf-8",
    )

    metadata = load_document(path).metadata()

    assert all(isinstance(v, (str, int, float, bool)) for v in metadata.values())
    assert metadata["tags"] == "a, b"


# ── Section splitting ────────────────────────────────────────────────────

def test_sections_split_on_h2_and_keep_the_heading(tmp_path):
    path = tmp_path / "doc.md"
    path.write_text(
        "---\ntitle: T\n---\n"
        "Intro paragraph.\n\n"
        "## Alpha\n\nAlpha body.\n\n"
        "## Beta\n\nBeta body.\n",
        encoding="utf-8",
    )

    sections = list(split_into_sections(load_document(path)))

    assert [heading for heading, _ in sections] == ["T", "Alpha", "Beta"]
    # The preamble is kept rather than dropped.
    assert "Intro paragraph." in sections[0][1]
    # Each chunk repeats its heading so it reads standalone once retrieved.
    assert sections[1][1].startswith("Alpha")
    assert "Alpha body." in sections[1][1]


def test_document_with_no_headings_yields_one_section(tmp_path):
    path = tmp_path / "flat.md"
    path.write_text("---\ntitle: Flat\n---\nJust one block of text.\n", encoding="utf-8")

    sections = list(split_into_sections(load_document(path)))

    assert len(sections) == 1
    assert sections[0][0] == "Flat"


def test_empty_directory_loads_nothing(tmp_path):
    assert load_documents(tmp_path) == []


# ── The shipped corpus ───────────────────────────────────────────────────

def test_shipped_documents_load():
    documents = load_documents()

    assert len(documents) >= 8
    slugs = {d.slug for d in documents}
    # The tax documents the advisor is expected to ground answers in.
    assert {
        "tax-regimes-fy2026-27",
        "section-80c-deductions",
        "health-insurance-80d",
        "nps-retirement-80ccd",
        "hra-and-home-loan",
        "tax-saving-playbook",
    } <= slugs


def test_every_document_declares_a_known_persona():
    for document in load_documents():
        assert document.persona in VALID_PERSONAS, document.slug
        assert document.title
        assert document.body.strip()


def test_every_persona_has_its_own_material():
    personas = {d.persona for d in load_documents()}

    for persona in get_valid_personas():
        assert persona in personas, f"no document for persona {persona}"
    assert SHARED_PERSONA in personas


def test_chunks_carry_source_section_and_persona():
    chunks = list(iter_document_chunks())

    assert len(chunks) >= 40
    for text, metadata in chunks:
        assert text.strip()
        assert metadata["source"]
        assert metadata["section"]
        assert metadata["persona"] in VALID_PERSONAS
        assert metadata["origin"] == "document"


def test_tax_documents_mention_the_key_sections():
    """The corpus must actually contain the figures the advisor will be asked for."""
    corpus = "\n".join(text for text, _ in iter_document_chunks())

    for token in ("80C", "80D", "80CCD(2)", "1,50,000", "75,000", "12,00,000", "Section 123"):
        assert token in corpus, f"{token!r} missing from the knowledge documents"


# ── Persona-aware retrieval ──────────────────────────────────────────────

def test_keyword_fallback_prefers_the_personas_own_material():
    results = kb._keyword_search(
        "how should I think about buying a business with a durable advantage",
        top_k=5,
        persona="warren_buffett",
    )

    assert results
    assert any(doc.metadata.get("persona_match") for doc in results)


def test_keyword_fallback_still_reaches_tax_material_for_a_tax_question():
    """Persona bias must not lock a persona out of the rest of the corpus."""
    results = kb._keyword_search(
        "deduction limit under section 80C for ELSS and PPF investments",
        top_k=5,
        persona="warren_buffett",
    )

    assert any("80C" in doc.page_content for doc in results)


def test_keyword_fallback_covers_the_markdown_documents():
    results = kb._keyword_search(
        "employer NPS contribution under the new regime",
        top_k=5,
        persona="indian_finance",
    )

    assert results
    assert any(doc.metadata.get("origin") == "document" for doc in results)


def test_merge_prefers_scoped_hits_but_keeps_general_ones():
    scoped = [(Document("persona chunk", {"persona": "warren_buffett"}), 0.50)]
    general = [
        (Document("persona chunk", {"persona": "warren_buffett"}), 0.50),
        (Document("general chunk", {"persona": "all"}), 0.52),
    ]

    merged = kb._merge_results(scoped, general, boost=0.08)

    assert len(merged) == 2
    # 0.50 + 0.08 boost beats the 0.52 general hit.
    assert merged[0][0].page_content == "persona chunk"
    assert merged[0][0].metadata["persona_match"] is True
    assert merged[1][0].metadata["persona_match"] is False


def test_merge_does_not_let_the_boost_exceed_one():
    scoped = [(Document("x", {}), 0.99)]
    merged = kb._merge_results(scoped, [], boost=0.08)

    assert merged[0][1] == pytest.approx(1.0)


def test_retrieve_accepts_a_persona_and_returns_documents():
    results = kb.retrieve("how do I save tax this year", persona="indian_finance")

    assert isinstance(results, list)
    for doc in results:
        assert isinstance(doc.page_content, str)
        assert "score" in doc.metadata
