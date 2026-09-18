"""A dependency-free BM25 retriever for memory-constrained hosts.

Why this exists
---------------
The Chroma backend embeds with a local ONNX MiniLM model. That is the better
retriever, but ``chromadb`` + ``onnxruntime`` + the 80 MB model do not fit in a
512 MB container alongside FastAPI and SQLAlchemy — the process is OOM-killed
on boot, and on an ephemeral filesystem the model re-downloads every restart.

BM25 over a corpus this size (under a hundred chunks) is a genuinely good
retriever, not a token fallback: it is the standard lexical baseline that
dense retrievers are measured against, and it is particularly strong on the
kind of query this app gets, where the useful signal is specific vocabulary —
"80C", "ELSS", "HRA", "moat". It costs a few hundred kilobytes and no model.

What it gives up is synonymy: a question phrased as "how do I pay less tax"
will not match a passage that only ever says "deduction". The Chroma backend
handles that, which is why it stays the default wherever there is room.
"""

from __future__ import annotations

import logging
import math
import re
from collections import Counter
from typing import Any, Iterable

from app.rag.vector_store import Document, content_id

logger = logging.getLogger(__name__)

# Okapi BM25 parameters. k1 controls term-frequency saturation, b the strength
# of length normalisation; these are the usual defaults and behave well here.
_K1 = 1.5
_B = 0.75

_TOKEN_RE = re.compile(r"[a-z0-9₹%()]+")

_STOPWORDS = frozenset(
    """
    a about an and any are as at be been but by can could do does doing for from
    get got has have how i if in into is it its just like make me more much my of
    on or should so some than that the their them then there these they this to
    too under up was we what when where which who why will with would you your
    """.split()
)


#: Suffix rules, longest first. Deliberately conservative — this is not a full
#: Porter stemmer, just enough that "deductions" matches a query for
#: "deduction" and "investing" matches "invest". Over-stemming would collapse
#: distinct terms, which costs more here than missing a few inflections.
_SUFFIXES: tuple[tuple[str, str], ...] = (
    ("ies", "y"),
    ("ing", ""),
    ("ed", ""),
    ("ly", ""),
    ("s", ""),
)

_MIN_STEM = 3


def stem(token: str) -> str:
    """Strip one common inflectional suffix, leaving section numbers alone."""
    # Anything containing a digit is an identifier — 80c, 80ccd(1b), 1.5 —
    # and must never be stemmed.
    if any(character.isdigit() for character in token):
        return token
    if token.endswith("ss"):  # "class", "process"
        return token

    for suffix, replacement in _SUFFIXES:
        if token.endswith(suffix) and len(token) - len(suffix) >= _MIN_STEM:
            return token[: -len(suffix)] + replacement
    return token


def tokenize(text: str) -> list[str]:
    """Lowercase, split, drop stopwords and single characters, then stem.

    Section numbers survive intact: "80C" stays one token, and "80CCD(1B)"
    keeps its parentheses so it does not collapse onto "80CCD".
    """
    return [
        stem(token)
        for token in _TOKEN_RE.findall(text.casefold())
        if token not in _STOPWORDS and len(token) > 1
    ]


class BM25Store:
    """An in-memory BM25 index over the knowledge corpus."""

    def __init__(self) -> None:
        self._ids: list[str] = []
        self._texts: list[str] = []
        self._metadatas: list[dict[str, Any]] = []
        self._term_frequencies: list[Counter[str]] = []
        self._lengths: list[int] = []
        self._document_frequency: Counter[str] = Counter()
        self._average_length: float = 0.0
        self._seen: set[str] = set()

    # ── Writes ───────────────────────────────────────────────────────
    def add_texts(
        self,
        texts: Iterable[str],
        metadatas: list[dict[str, Any]] | None = None,
        *,
        ids: list[str] | None = None,
        **_: Any,
    ) -> list[str]:
        """Index *texts*, skipping any whose content is already present."""
        text_list = [t for t in texts if t and t.strip()]
        if not text_list:
            return []

        meta_list = list(metadatas or [])
        while len(meta_list) < len(text_list):
            meta_list.append({})

        given_ids = list(ids) if ids else [content_id(t) for t in text_list]
        added: list[str] = []

        for text, metadata, doc_id in zip(text_list, meta_list, given_ids):
            if doc_id in self._seen:
                continue  # content hash already indexed — same idempotence as Chroma
            self._seen.add(doc_id)

            # The title and section heading are worth more than body prose, so
            # they are indexed a second time rather than given a separate field.
            weighted = text
            for key in ("source", "section", "tags"):
                value = metadata.get(key)
                if value:
                    weighted += f"\n{value}"

            tokens = tokenize(weighted)
            counts = Counter(tokens)

            self._ids.append(doc_id)
            self._texts.append(text)
            self._metadatas.append(dict(metadata))
            self._term_frequencies.append(counts)
            self._lengths.append(len(tokens))
            self._document_frequency.update(counts.keys())
            added.append(doc_id)

        if self._lengths:
            self._average_length = sum(self._lengths) / len(self._lengths)

        logger.info("BM25 index now holds %d chunk(s)", len(self._ids))
        return added

    def count(self) -> int:
        return len(self._ids)

    # ── Reads ────────────────────────────────────────────────────────
    def _idf(self, term: str) -> float:
        """Inverse document frequency, in the BM25+ form that stays positive."""
        n = len(self._ids)
        df = self._document_frequency.get(term, 0)
        if df == 0:
            return 0.0
        return math.log(1 + (n - df + 0.5) / (df + 0.5))

    def search(
        self,
        query: str,
        k: int = 4,
        persona: str | None = None,
        persona_boost: float = 0.0,
        shared_persona: str = "all",
    ) -> list[tuple[Document, float]]:
        """Return ``(document, score)`` pairs, best first.

        Scores are normalised to 0–1 against the best hit so callers can apply
        the same threshold they use for cosine similarity.
        """
        if not self._ids:
            return []

        query_terms = tokenize(query)
        if not query_terms:
            return []

        scored: list[tuple[float, int]] = []
        for index, counts in enumerate(self._term_frequencies):
            length = self._lengths[index] or 1
            score = 0.0
            for term in query_terms:
                frequency = counts.get(term, 0)
                if not frequency:
                    continue
                denominator = frequency + _K1 * (
                    1 - _B + _B * length / (self._average_length or 1)
                )
                score += self._idf(term) * (frequency * (_K1 + 1)) / denominator

            if score <= 0:
                continue

            if persona and persona_boost:
                doc_persona = self._metadatas[index].get("persona")
                if doc_persona in (persona, shared_persona):
                    score *= 1 + persona_boost

            scored.append((score, index))

        if not scored:
            return []

        scored.sort(reverse=True)
        best = scored[0][0] or 1.0

        results: list[tuple[Document, float]] = []
        for raw_score, index in scored[:k]:
            normalised = max(0.0, min(1.0, raw_score / best))
            metadata = dict(self._metadatas[index])
            metadata["score"] = round(normalised, 4)
            metadata["retrieval"] = "bm25"
            metadata["persona_match"] = metadata.get("persona") in (
                persona,
                shared_persona,
            )
            results.append((Document(page_content=self._texts[index], metadata=metadata), normalised))

        return results

    def clear(self) -> None:
        """Drop the whole index."""
        self.__init__()  # type: ignore[misc]
