"""A LangChain ``VectorStore`` backed directly by a persistent Chroma collection.

Why not ``langchain-chroma``?  That package pins ``langchain-core`` to a
narrow range, which conflicts with the versions already installed here.
Subclassing the ``VectorStore`` interface over the ``chromadb`` client we
already depend on gives the same LangChain surface — notably
``as_retriever()``, which the chain in :mod:`app.rag.chain` builds on — with
one fewer dependency to keep in step.

Embeddings are always computed by the injected ``Embeddings`` object and
passed to Chroma explicitly, so the collection itself carries no embedding
function and the choice of model lives in one place.
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any, Iterable, Sequence

logger = logging.getLogger(__name__)

try:  # pragma: no cover - import guard
    from langchain_core.documents import Document
    from langchain_core.vectorstores import VectorStore as _BaseVectorStore

    LANGCHAIN_VECTORSTORE_AVAILABLE = True
except Exception:  # noqa: BLE001
    LANGCHAIN_VECTORSTORE_AVAILABLE = False

    class Document:  # type: ignore[no-redef]
        """Minimal stand-in for ``langchain_core.documents.Document``."""

        def __init__(self, page_content: str, metadata: dict[str, Any] | None = None):
            self.page_content = page_content
            self.metadata = metadata or {}

        def __repr__(self) -> str:  # pragma: no cover - debug helper
            return f"Document(page_content={self.page_content[:60]!r})"

    class _BaseVectorStore:  # type: ignore[no-redef]
        """Stand-in base so the subclass below still imports without LangChain."""


def content_id(text: str, namespace: str = "") -> str:
    """Return a stable ID for *text* so re-indexing updates instead of duplicating."""
    digest = hashlib.sha256(f"{namespace}\x00{text}".encode("utf-8")).hexdigest()
    return digest[:32]


class ChromaVectorStore(_BaseVectorStore):
    """Persistent Chroma-backed vector store implementing the LangChain API."""

    def __init__(
        self,
        collection: Any,
        embedding: Any,
        *,
        namespace: str = "",
    ) -> None:
        self._collection = collection
        self._embedding = embedding
        self._namespace = namespace

    # ── LangChain requires this property ─────────────────────────────
    @property
    def embeddings(self) -> Any:
        return self._embedding

    @property
    def collection(self) -> Any:
        return self._collection

    def count(self) -> int:
        try:
            return int(self._collection.count())
        except Exception:  # noqa: BLE001
            return 0

    # ── Writes ───────────────────────────────────────────────────────
    def add_texts(
        self,
        texts: Iterable[str],
        metadatas: list[dict[str, Any]] | None = None,
        *,
        ids: list[str] | None = None,
        **kwargs: Any,
    ) -> list[str]:
        """Embed *texts* and upsert them, returning the assigned IDs."""
        text_list = [t for t in texts if t and t.strip()]
        if not text_list:
            return []

        meta_list = list(metadatas or [])
        # Chroma rejects an empty metadata mapping, so every row gets at least
        # one key.
        while len(meta_list) < len(text_list):
            meta_list.append({})
        meta_list = [
            {"source": "knowledge_base", **{k: v for k, v in m.items() if v is not None}}
            for m in meta_list[: len(text_list)]
        ]

        doc_ids = list(ids) if ids else [content_id(t, self._namespace) for t in text_list]
        vectors = self._embedding.embed_documents(text_list)

        self._collection.upsert(
            ids=doc_ids,
            documents=text_list,
            metadatas=meta_list,
            embeddings=vectors,
        )
        logger.info("Upserted %d chunk(s) into the vector store", len(doc_ids))
        return doc_ids

    def delete(self, ids: list[str] | None = None, **kwargs: Any) -> bool:
        if not ids:
            return False
        self._collection.delete(ids=ids)
        return True

    # ── Reads ────────────────────────────────────────────────────────
    def similarity_search(
        self,
        query: str,
        k: int = 4,
        **kwargs: Any,
    ) -> list[Document]:
        return [doc for doc, _ in self.similarity_search_with_score(query, k, **kwargs)]

    def similarity_search_with_score(
        self,
        query: str,
        k: int = 4,
        *,
        where: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> list[tuple[Document, float]]:
        """Return ``(document, similarity)`` pairs, most similar first.

        Chroma reports cosine *distance*; it is converted to a 0–1 similarity
        so callers can threshold on an intuitive scale.
        """
        if not query or not query.strip():
            return []
        if self.count() == 0:
            return []

        vector = self._embedding.embed_query(query)
        if not vector:
            return []

        results = self._collection.query(
            query_embeddings=[vector],
            n_results=max(1, min(k, self.count())),
            include=["documents", "metadatas", "distances"],
            **({"where": where} if where else {}),
        )

        documents = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]

        pairs: list[tuple[Document, float]] = []
        for index, text in enumerate(documents):
            metadata = dict(metadatas[index]) if index < len(metadatas) and metadatas[index] else {}
            distance = float(distances[index]) if index < len(distances) else 1.0
            similarity = max(0.0, min(1.0, 1.0 - distance))
            metadata["score"] = round(similarity, 4)
            pairs.append((Document(page_content=text, metadata=metadata), similarity))
        return pairs

    # ── Constructor required by the VectorStore interface ────────────
    @classmethod
    def from_texts(
        cls,
        texts: list[str],
        embedding: Any,
        metadatas: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> "ChromaVectorStore":
        collection = kwargs.pop("collection", None)
        if collection is None:
            raise ValueError(
                "ChromaVectorStore.from_texts requires a 'collection' keyword "
                "argument; use app.rag.knowledge_base.get_knowledge_base() instead."
            )
        store = cls(collection, embedding, namespace=kwargs.pop("namespace", ""))
        store.add_texts(texts, metadatas)
        return store


def _patch_numpy_aliases() -> None:
    """Restore the numpy 1.x aliases chromadb 0.5 still references.

    ``np.float_``/``np.int_``/``np.uint`` were removed in numpy 2.0; without
    these shims importing chromadb raises ``AttributeError`` on a modern
    numpy.  Harmless when the aliases already exist.
    """
    try:
        import numpy as np
    except Exception:  # noqa: BLE001 - numpy comes with chromadb; absence is handled upstream
        return

    for alias, target in (("float_", "float64"), ("int_", "int64"), ("uint", "uint64")):
        if not hasattr(np, alias) and hasattr(np, target):
            setattr(np, alias, getattr(np, target))


def open_collection(directory: str | Path, name: str) -> Any:
    """Open (or create) the persistent Chroma collection used by the app."""
    _patch_numpy_aliases()
    import chromadb

    path = Path(directory).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(path))
    collection = client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
        embedding_function=None,
    )
    logger.info("Chroma collection %r ready at %s", name, path)
    return client, collection
