"""Loader for the markdown knowledge documents in ``app/rag/documents/``.

(The module is named ``doc_loader`` rather than ``documents`` so it does not
shadow the ``documents/`` folder it reads.)


Each document opens with a small YAML-style frontmatter block::

    ---
    title: Section 80C (now Section 123) — The ₹1.5 Lakh Deduction
    topic: indian_tax
    persona: indian_finance
    tags: [80C, ELSS, PPF]
    as_of: 2026-09-18
    ---

The loader splits a document at its ``##`` headings first, so a retrieved chunk
is a coherent section rather than an arbitrary window, then hands anything still
too long to the LangChain splitter. Every chunk carries its document title and
section heading, which is what the advisor cites.

``persona`` decides who retrieves the document: one of the persona keys, or
``all`` for material every persona should see. Adding a document is dropping a
.md file in the folder — no Python change, and the content hash keeps
re-indexing idempotent.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

logger = logging.getLogger(__name__)

DOCUMENTS_DIR = Path(__file__).resolve().parent / "documents"

#: Persona key meaning "every persona retrieves this".
SHARED_PERSONA = "all"

_FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)


@dataclass
class KnowledgeDocument:
    """One markdown document plus its parsed frontmatter."""

    path: Path
    title: str
    topic: str
    persona: str
    body: str
    tags: list[str] = field(default_factory=list)
    as_of: str | None = None

    @property
    def slug(self) -> str:
        return self.path.stem

    def metadata(self) -> dict[str, Any]:
        """Base metadata attached to every chunk of this document."""
        meta: dict[str, Any] = {
            "source": self.title,
            "document": self.slug,
            "topic": self.topic,
            "persona": self.persona,
            "origin": "document",
        }
        if self.tags:
            # Chroma metadata values must be scalars.
            meta["tags"] = ", ".join(self.tags)
        if self.as_of:
            meta["as_of"] = self.as_of
        return meta


def _parse_scalar(raw: str) -> Any:
    """Parse a frontmatter value — a bare scalar or an inline ``[a, b]`` list."""
    value = raw.strip()
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [item.strip().strip("'\"") for item in inner.split(",") if item.strip()]
    return value.strip("'\"")


def _parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Split *text* into ``(frontmatter, body)``.

    A document without frontmatter is not an error — it just gets defaults.
    """
    match = _FRONTMATTER_RE.match(text)
    if not match:
        return {}, text

    data: dict[str, Any] = {}
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition(":")
        if not separator:
            continue
        data[key.strip()] = _parse_scalar(value)

    return data, text[match.end():]


def load_document(path: Path) -> KnowledgeDocument:
    """Read and parse a single markdown knowledge document."""
    raw = path.read_text(encoding="utf-8")
    front, body = _parse_frontmatter(raw)

    tags = front.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    return KnowledgeDocument(
        path=path,
        title=str(front.get("title") or path.stem.replace("-", " ").title()),
        topic=str(front.get("topic") or "general"),
        persona=str(front.get("persona") or SHARED_PERSONA),
        body=body.strip(),
        tags=[str(t) for t in tags],
        as_of=str(front["as_of"]) if front.get("as_of") else None,
    )


def load_documents(directory: Path | None = None) -> list[KnowledgeDocument]:
    """Load every ``*.md`` document in *directory*, sorted by filename."""
    folder = directory or DOCUMENTS_DIR
    if not folder.is_dir():
        logger.warning("Knowledge documents directory not found: %s", folder)
        return []

    documents: list[KnowledgeDocument] = []
    for path in sorted(folder.glob("*.md")):
        try:
            documents.append(load_document(path))
        except Exception:  # noqa: BLE001 - one bad file must not stop the rest
            logger.warning("Could not load knowledge document %s", path, exc_info=True)

    logger.info("Loaded %d knowledge document(s) from %s", len(documents), folder)
    return documents


def split_into_sections(document: KnowledgeDocument) -> Iterator[tuple[str, str]]:
    """Yield ``(heading, section_text)`` pairs for a document's ``##`` sections.

    Text before the first heading is yielded under the document title, so an
    intro paragraph is never dropped.
    """
    body = document.body
    headings = list(_HEADING_RE.finditer(body))

    if not headings:
        if body.strip():
            yield document.title, body.strip()
        return

    preamble = body[: headings[0].start()].strip()
    if preamble:
        yield document.title, preamble

    for index, match in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(body)
        section = body[match.end():end].strip()
        if section:
            # The heading is prepended so the chunk reads standalone once
            # retrieved out of context.
            yield match.group(1), f"{match.group(1)}\n\n{section}"


def iter_document_chunks(
    directory: Path | None = None,
    splitter: Any = None,
) -> Iterator[tuple[str, dict[str, Any]]]:
    """Yield ``(text, metadata)`` for every chunk of every document.

    *splitter* is an optional LangChain text splitter used to break up any
    section that is longer than its chunk size.
    """
    for document in load_documents(directory):
        base = document.metadata()
        for heading, section in split_into_sections(document):
            pieces = splitter.split_text(section) if splitter is not None else [section]
            for piece in pieces:
                if not piece.strip():
                    continue
                yield piece.strip(), {**base, "section": heading}
