"""The finance knowledge base — chunking, indexing, and retrieval.

Pipeline
--------
1. ``RecursiveCharacterTextSplitter`` splits source text into overlapping
   chunks sized by ``RAG_CHUNK_SIZE``/``RAG_CHUNK_OVERLAP``.
2. Each chunk is embedded locally (see :mod:`app.rag.embeddings`) and
   upserted into a persistent Chroma collection under a content-hash ID.
3. Queries run a cosine similarity search and come back as LangChain
   ``Document`` objects carrying their topic and score.

Everything is built lazily on first use and guarded by a lock, so importing
this module is free and a cold start never blocks the event loop more than
once.  If the stack cannot be built at all — langchain-core missing, chromadb
broken — the knowledge base degrades to a keyword search over the seed
corpus rather than failing the request.
"""

from __future__ import annotations

import logging
import re
import threading
from typing import Any, Iterable, Sequence

from app.core.config import settings
from app.rag.doc_loader import SHARED_PERSONA, iter_document_chunks, load_documents
from app.rag.knowledge import KNOWLEDGE_CHUNKS, SOURCE_LABELS, iter_chunks
from app.rag.vector_store import ChromaVectorStore, Document

logger = logging.getLogger(__name__)

_MIN_SCORE = 0.05

#: Which persona each seed topic belongs to. Budgeting material is shared.
_TOPIC_PERSONAS: dict[str, str] = {
    "indian_tax": "indian_finance",
    "value_investing": "warren_buffett",
    "conscious_spending": "ramit_sethi",
    "budgeting": SHARED_PERSONA,
}

#: How much a persona's own material is favoured when results are merged.
#: Small enough that a clearly better general chunk still wins.
_PERSONA_BOOST = 0.08


def _build_splitter() -> Any:
    """Return a LangChain text splitter, or ``None`` if the package is absent."""
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
    except Exception as exc:  # noqa: BLE001
        logger.warning("langchain-text-splitters unavailable (%s); using whole chunks", exc)
        return None

    return RecursiveCharacterTextSplitter(
        chunk_size=settings.RAG_CHUNK_SIZE,
        chunk_overlap=settings.RAG_CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )


class KnowledgeBase:
    """Lazily initialised vector store over the finance knowledge corpus."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._store: ChromaVectorStore | None = None
        self._splitter: Any = None
        self._client: Any = None
        self._backend: str = "uninitialised"
        self._error: str | None = None
        self._initialised = False

    # ── Construction ─────────────────────────────────────────────────
    def _initialise(self) -> None:
        """Build the splitter, embeddings, and store exactly once."""
        if self._initialised:
            return
        with self._lock:
            if self._initialised:
                return
            try:
                from app.rag.embeddings import build_embeddings
                from app.rag.vector_store import open_collection

                embeddings, backend = build_embeddings()
                self._backend = backend
                self._splitter = _build_splitter()
                self._client, collection = open_collection(
                    settings.CHROMA_DIR, settings.RAG_COLLECTION
                )
                self._store = ChromaVectorStore(collection, embeddings)
                self._seed_corpus()
                logger.info(
                    "Knowledge base ready (embeddings=%s, chunks=%d)",
                    backend,
                    self._store.count(),
                )
            except Exception as exc:  # noqa: BLE001 - retrieval must never 500 the API
                self._error = str(exc)
                self._store = None
                logger.warning(
                    "Vector knowledge base unavailable (%s); falling back to "
                    "keyword retrieval over the seed corpus.",
                    exc,
                )
            finally:
                self._initialised = True

    def _seed_corpus(self) -> None:
        """Index the bundled corpus and the markdown documents.

        Seeding runs on every start rather than only on an empty collection:
        IDs are content hashes, so an unchanged corpus is a no-op upsert while
        an edited or newly added document is picked up automatically.
        """
        assert self._store is not None

        texts: list[str] = []
        metadatas: list[dict[str, Any]] = []

        # 1. The short tagged facts.
        for topic, text in iter_chunks():
            for chunk in self._split(text):
                texts.append(chunk)
                metadatas.append(
                    {
                        "topic": topic,
                        "source": SOURCE_LABELS.get(topic, "Finance knowledge"),
                        "persona": _TOPIC_PERSONAS.get(topic, SHARED_PERSONA),
                        "origin": "seed",
                    }
                )

        # 2. The markdown knowledge documents, split by section.
        for text, metadata in iter_document_chunks(splitter=self._splitter):
            texts.append(text)
            metadatas.append(metadata)

        self._store.add_texts(texts, metadatas)
        logger.info("Indexed %d knowledge chunk(s)", len(texts))

    def _split(self, text: str) -> list[str]:
        """Split *text* with the LangChain splitter, or return it unchanged."""
        if self._splitter is None:
            return [text] if text.strip() else []
        return [c for c in self._splitter.split_text(text) if c.strip()]

    # ── Status ───────────────────────────────────────────────────────
    @property
    def available(self) -> bool:
        self._initialise()
        return self._store is not None

    def status(self) -> dict[str, Any]:
        """Describe the knowledge base — handy for a health endpoint."""
        self._initialise()
        return {
            "vector_store": "chroma" if self._store is not None else "keyword-fallback",
            "embeddings": self._backend,
            "splitter": "recursive-character" if self._splitter else "none",
            "documents": self._store.count() if self._store is not None else len(KNOWLEDGE_CHUNKS),
            "collection": settings.RAG_COLLECTION,
            "source_documents": len(load_documents()),
            "error": self._error,
        }

    # ── Writes ───────────────────────────────────────────────────────
    def index(
        self,
        texts: Sequence[str] | str,
        metadata: dict[str, Any] | None = None,
    ) -> list[str]:
        """Chunk, embed, and index *texts*; returns the stored document IDs."""
        self._initialise()
        if self._store is None:
            logger.warning("index() skipped — vector store unavailable")
            return []

        raw = [texts] if isinstance(texts, str) else list(texts)
        chunks: list[str] = []
        for item in raw:
            chunks.extend(self._split(item))
        if not chunks:
            return []

        base_meta = {"origin": "user", **(metadata or {})}
        return self._store.add_texts(chunks, [dict(base_meta) for _ in chunks])

    def reset(self) -> None:
        """Drop every indexed chunk and re-seed the bundled corpus."""
        with self._lock:
            if self._client is not None:
                try:
                    self._client.delete_collection(settings.RAG_COLLECTION)
                except Exception:  # noqa: BLE001 - absent collection is fine
                    pass
            self._store = None
            self._client = None
            self._initialised = False
            self._error = None
        self._initialise()

    # ── Reads ────────────────────────────────────────────────────────
    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        persona: str | None = None,
    ) -> list[Document]:
        """Return the most relevant chunks for *query*, best first.

        When *persona* is given, the search is blended: the persona's own
        material (plus anything tagged ``all``) is retrieved alongside an
        unfiltered search, the persona's hits get a small score boost, and the
        merged list is truncated to *top_k*. So the Buffett persona leads with
        value-investing passages but can still cite an emergency-fund rule, and
        a tax question asked of any persona can still reach the tax documents.
        """
        if not query or not query.strip():
            return []

        k = top_k or settings.RAG_TOP_K
        self._initialise()

        if self._store is None:
            return _keyword_search(query, k, persona)

        try:
            general = self._store.similarity_search_with_score(query, k)
            scoped = self._persona_search(query, k, persona) if persona else []
        except Exception:  # noqa: BLE001
            logger.warning("Vector search failed for %.80s", query, exc_info=True)
            return _keyword_search(query, k, persona)

        merged = _merge_results(scoped, general, boost=_PERSONA_BOOST)

        # An all-below-threshold result usually means the store is healthy but
        # the question is off-topic: returning nothing is the honest answer.
        return [doc for doc, score in merged if score >= _MIN_SCORE][:k]

    def _persona_search(
        self,
        query: str,
        k: int,
        persona: str,
    ) -> list[tuple[Document, float]]:
        """Search only the chunks tagged for *persona* (or shared).

        Older Chroma builds reject the ``$in`` operator; the empty result from
        a failed filtered search is harmless because the general search has
        already covered the corpus.
        """
        assert self._store is not None
        try:
            return self._store.similarity_search_with_score(
                query,
                k,
                where={"persona": {"$in": [persona, SHARED_PERSONA]}},
            )
        except Exception:  # noqa: BLE001
            logger.debug("Persona-filtered search unavailable", exc_info=True)
            return []

    def as_retriever(self, persona: str | None = None, **kwargs: Any) -> Any:
        """Return a LangChain retriever over this store.

        Falls back to a small runnable wrapper when the real ``VectorStore``
        base class is unavailable, so the chain builds either way.
        """
        self._initialise()
        if self._store is not None:
            try:
                search_kwargs = {"k": settings.RAG_TOP_K, **kwargs.pop("search_kwargs", {})}
                return self._store.as_retriever(search_kwargs=search_kwargs, **kwargs)
            except Exception:  # noqa: BLE001
                logger.debug("as_retriever() unsupported; using callable retriever")

        def _retrieve(query: str) -> list[Document]:
            return self.retrieve(query, persona=persona)

        try:
            from langchain_core.runnables import RunnableLambda

            return RunnableLambda(_retrieve)
        except Exception:  # noqa: BLE001
            return _retrieve


# ── Result merging ───────────────────────────────────────────────────────


def _merge_results(
    scoped: list[tuple[Document, float]],
    general: list[tuple[Document, float]],
    *,
    boost: float,
) -> list[tuple[Document, float]]:
    """Merge persona-scoped and general hits, de-duplicated by content.

    A chunk appearing in both keeps the higher (boosted) score, so the
    persona's own material sorts first without excluding anything.
    """
    merged: dict[str, tuple[Document, float]] = {}

    for doc, score in scoped:
        boosted = min(1.0, score + boost)
        doc.metadata["persona_match"] = True
        merged[doc.page_content] = (doc, boosted)

    for doc, score in general:
        # A chunk already added from the scoped search keeps its boosted score.
        if doc.page_content in merged:
            continue
        doc.metadata.setdefault("persona_match", False)
        merged[doc.page_content] = (doc, score)

    return sorted(merged.values(), key=lambda pair: pair[1], reverse=True)


# ── Keyword fallback ─────────────────────────────────────────────────────

_TOKEN_RE = re.compile(r"[a-z0-9₹]+")
_STOPWORDS = frozenset(
    "a an and are as at be by can do does for from how i in is it my of on or "
    "should that the to was what when where which who why with you your".split()
)


def _keyword_search(
    query: str,
    top_k: int,
    persona: str | None = None,
) -> list[Document]:
    """Rank corpus chunks by term overlap — used when the vector store is down.

    Covers both the short seed facts and the markdown documents, and applies
    the same persona boost as the vector path so the fallback behaves
    consistently rather than merely not crashing.
    """
    query_terms = {
        t for t in _TOKEN_RE.findall(query.casefold()) if t not in _STOPWORDS and len(t) > 2
    }
    if not query_terms:
        return []

    candidates: list[tuple[str, dict[str, Any]]] = [
        (
            text,
            {
                "topic": topic,
                "source": SOURCE_LABELS.get(topic, "Finance knowledge"),
                "persona": _TOPIC_PERSONAS.get(topic, SHARED_PERSONA),
            },
        )
        for topic, text in iter_chunks()
    ]
    try:
        candidates.extend(iter_document_chunks())
    except Exception:  # noqa: BLE001 - the seed facts alone are still useful
        logger.debug("Could not load knowledge documents for keyword search", exc_info=True)

    scored: list[tuple[float, str, dict[str, Any]]] = []
    for text, metadata in candidates:
        terms = set(_TOKEN_RE.findall(text.casefold()))
        overlap = len(query_terms & terms)
        if not overlap:
            continue

        score = overlap / len(query_terms)
        matches_persona = persona is not None and metadata.get("persona") in (
            persona,
            SHARED_PERSONA,
        )
        if matches_persona:
            score = min(1.0, score + _PERSONA_BOOST)
        scored.append((score, text, {**metadata, "persona_match": matches_persona}))

    scored.sort(key=lambda row: row[0], reverse=True)
    return [
        Document(
            page_content=text,
            metadata={
                **metadata,
                "score": round(score, 4),
                "retrieval": "keyword-fallback",
            },
        )
        for score, text, metadata in scored[:top_k]
    ]


# ── Module-level singleton & helpers ─────────────────────────────────────

_knowledge_base: KnowledgeBase | None = None
_singleton_lock = threading.Lock()


def get_knowledge_base() -> KnowledgeBase:
    """Return the process-wide :class:`KnowledgeBase`."""
    global _knowledge_base
    if _knowledge_base is None:
        with _singleton_lock:
            if _knowledge_base is None:
                _knowledge_base = KnowledgeBase()
    return _knowledge_base


def retrieve(
    query: str,
    top_k: int | None = None,
    persona: str | None = None,
) -> list[Document]:
    """Similarity search over the knowledge base (synchronous)."""
    return get_knowledge_base().retrieve(query, top_k, persona)


def retrieve_texts(
    query: str,
    top_k: int | None = None,
    persona: str | None = None,
) -> list[str]:
    """Same as :func:`retrieve` but returns plain strings."""
    return [doc.page_content for doc in retrieve(query, top_k, persona)]


def index_texts(
    texts: Sequence[str] | str,
    metadata: dict[str, Any] | None = None,
) -> list[str]:
    """Chunk and index *texts* into the knowledge base."""
    return get_knowledge_base().index(texts, metadata)


def reset_knowledge_base() -> None:
    """Delete and rebuild the collection — used by tests and maintenance."""
    get_knowledge_base().reset()


def rag_status() -> dict[str, Any]:
    """Return a serialisable description of the retrieval stack."""
    return get_knowledge_base().status()


def format_documents(documents: Iterable[Document]) -> str:
    """Render retrieved documents as the context block sent to the LLM."""
    blocks: list[str] = []
    for index, doc in enumerate(documents, start=1):
        source = doc.metadata.get("source") or "Finance knowledge"
        blocks.append(f"[{index}] ({source}) {doc.page_content.strip()}")
    return "\n\n".join(blocks)
