"""Picking a retrieval backend that fits the host.

The Chroma backend is the better retriever but needs roughly 350–450 MB of
resident memory once ``chromadb``, ``onnxruntime`` and the MiniLM model are
loaded. On a 512 MB container that is an OOM kill on boot, so the backend is
chosen from the memory limit the process actually runs under rather than
assumed.

``RAG_BACKEND`` overrides the detection: ``chroma``, ``lite``, or ``auto``.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

#: Below this, the Chroma stack does not fit alongside the rest of the app.
MIN_BYTES_FOR_CHROMA = 1_536 * 1024 * 1024  # 1.5 GiB

_CGROUP_V2 = Path("/sys/fs/cgroup/memory.max")
_CGROUP_V1 = Path("/sys/fs/cgroup/memory/memory.limit_in_bytes")

#: cgroup reports "no limit" as a huge sentinel; anything above this is unlimited.
_UNLIMITED = 1 << 62


def _read_int(path: Path) -> int | None:
    try:
        raw = path.read_text(encoding="utf-8").strip()
    except Exception:  # noqa: BLE001 - not on this platform
        return None
    if raw == "max":
        return None
    try:
        value = int(raw)
    except ValueError:
        return None
    return None if value >= _UNLIMITED else value


#: Environment variables set by hosts that cap memory well below a dev machine.
#: Used when the cgroup limit is unreadable, because reading host RAM there
#: would suggest far more memory than the process is actually allowed.
_PAAS_MARKERS = (
    "RENDER",            # Render
    "RENDER_SERVICE_ID",
    "FLY_APP_NAME",      # Fly.io
    "DYNO",              # Heroku
    "K_SERVICE",         # Cloud Run
    "WEBSITE_INSTANCE_ID",  # Azure App Service
    "VERCEL",
)


def cgroup_limit_bytes() -> int | None:
    """The container's memory ceiling, or ``None`` when there is no cgroup cap."""
    for path in (_CGROUP_V2, _CGROUP_V1):
        value = _read_int(path)
        if value:
            return value
    return None


def system_memory_bytes() -> int | None:
    """Total physical memory, or ``None`` if it cannot be determined."""
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    except (ValueError, OSError, AttributeError):
        return None


def on_managed_host() -> bool:
    """True when an environment variable marks this as a managed PaaS instance."""
    return any(os.environ.get(marker) for marker in _PAAS_MARKERS)


def memory_limit_bytes() -> int | None:
    """Best-effort memory ceiling for this process, or ``None`` if unknown.

    The container cgroup is authoritative — on Render, Fly, Docker and
    Kubernetes that is the number that gets the process OOM-killed. Host RAM is
    only consulted when there is no cgroup cap *and* nothing marks this as a
    managed host, since on a PaaS the host figure is wildly optimistic.
    """
    limit = cgroup_limit_bytes()
    if limit:
        return limit
    if on_managed_host():
        return None
    return system_memory_bytes()


def select_backend(configured: str = "auto") -> tuple[str, str]:
    """Return ``(backend, reason)`` where backend is ``"chroma"`` or ``"lite"``."""
    choice = (configured or "auto").strip().lower()

    if choice == "chroma":
        return "chroma", "forced by RAG_BACKEND=chroma"
    if choice in {"lite", "bm25"}:
        return "lite", "forced by RAG_BACKEND=lite"
    if choice != "auto":
        logger.warning("Unknown RAG_BACKEND %r; falling back to auto", configured)

    limit = memory_limit_bytes()
    if limit is None:
        if on_managed_host():
            return "lite", (
                "managed host with no readable memory limit; chose the "
                "low-memory backend. Set RAG_BACKEND=chroma to override."
            )
        return "lite", "memory limit undetectable; chose the low-memory backend"

    megabytes = limit // (1024 * 1024)
    if limit < MIN_BYTES_FOR_CHROMA:
        return "lite", f"only {megabytes} MB available; Chroma + ONNX would be OOM-killed"
    return "chroma", f"{megabytes} MB available"
