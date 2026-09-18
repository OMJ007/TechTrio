"""Embedding backends for the knowledge base.

The app talks to Groq, which has no embeddings endpoint, so embeddings are
produced locally.  Two implementations are provided:

``ChromaMiniLMEmbeddings``
    Wraps the ONNX ``all-MiniLM-L6-v2`` model that ships with ``chromadb``.
    No API key and no torch — the ~80 MB model is downloaded once on first
    use and cached under the user's home directory.

``HashingEmbeddings``
    A dependency-free fallback so the advisor keeps working (with weaker
    retrieval) on a machine where the ONNX model cannot be loaded — no
    network on first run, an unsupported platform, and so on.

Both implement the LangChain :class:`~langchain_core.embeddings.Embeddings`
interface when langchain-core is installed, and stand alone otherwise.
"""

from __future__ import annotations

import hashlib
import logging
import math
import re
import threading
from typing import Any, Sequence

logger = logging.getLogger(__name__)

try:  # pragma: no cover - import guard
    from langchain_core.embeddings import Embeddings as _LangChainEmbeddings

    LANGCHAIN_EMBEDDINGS_AVAILABLE = True
except Exception:  # noqa: BLE001
    LANGCHAIN_EMBEDDINGS_AVAILABLE = False

    class _LangChainEmbeddings:  # type: ignore[no-redef]
        """Minimal stand-in used when langchain-core is not installed."""

        def embed_documents(self, texts: list[str]) -> list[list[float]]:
            raise NotImplementedError

        def embed_query(self, text: str) -> list[float]:
            raise NotImplementedError


def _as_float_lists(raw: Any) -> list[list[float]]:
    """Normalise numpy arrays / nested sequences into plain float lists."""
    out: list[list[float]] = []
    for vector in raw:
        tolist = getattr(vector, "tolist", None)
        out.append([float(v) for v in (tolist() if callable(tolist) else vector)])
    return out


class ChromaMiniLMEmbeddings(_LangChainEmbeddings):
    """LangChain embeddings backed by Chroma's bundled ONNX MiniLM model."""

    def __init__(self) -> None:
        self._fn: Any = None
        self._lock = threading.Lock()

    def _embedding_fn(self) -> Any:
        """Load the ONNX embedding function once, under a lock."""
        if self._fn is None:
            with self._lock:
                if self._fn is None:
                    from chromadb.utils import embedding_functions

                    self._fn = embedding_functions.ONNXMiniLM_L6_V2()
                    logger.info("Loaded Chroma ONNX MiniLM-L6-v2 embedding model")
        return self._fn

    def _embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        fn = self._embedding_fn()
        try:
            raw = fn(input=list(texts))
        except TypeError:
            # chromadb < 0.5 used a positional ``texts`` argument.
            raw = fn(list(texts))
        return _as_float_lists(raw)

    # ── LangChain interface ──────────────────────────────────────────
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> list[float]:
        vectors = self._embed([text])
        return vectors[0] if vectors else []


class HashingEmbeddings(_LangChainEmbeddings):
    """Deterministic bag-of-words hashing embeddings — no model, no network.

    Quality is well below a real sentence encoder: it captures term overlap,
    not meaning.  It exists so that a missing or unloadable ONNX model
    degrades retrieval instead of taking the advisor down with it.
    """

    _TOKEN_RE = re.compile(r"[a-z0-9₹%]+")

    def __init__(self, dimensions: int = 512) -> None:
        self.dimensions = dimensions

    def _vector(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        tokens = self._TOKEN_RE.findall(text.casefold())
        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(v * v for v in vector))
        if norm == 0.0:
            return vector
        return [v / norm for v in vector]

    # ── LangChain interface ──────────────────────────────────────────
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vector(text)


def build_embeddings() -> tuple[_LangChainEmbeddings, str]:
    """Return ``(embeddings, backend_name)``, preferring the ONNX model.

    The model is exercised with a probe embedding here rather than on the
    first user question, so a failure surfaces at startup and the fallback
    is chosen before anything is indexed.
    """
    candidate = ChromaMiniLMEmbeddings()
    try:
        if candidate.embed_query("probe"):
            return candidate, "chroma-onnx-minilm-l6-v2"
        raise RuntimeError("embedding model returned an empty vector")
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Falling back to hashing embeddings — the ONNX MiniLM model could "
            "not be loaded (%s). Retrieval quality will be reduced; install a "
            "working chromadb to restore it.",
            exc,
        )
        return HashingEmbeddings(), "hashing-fallback"
