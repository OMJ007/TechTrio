"""Application configuration — legacy module.

New code should import from ``app.core.config`` instead.
This module re-exports the canonical settings singleton.

Existing consumers that reference legacy field names (JWT_SECRET_KEY,
POSTGRES_URL, etc.) continue to work because those aliases are defined
on the core Settings class.
"""

from app.core.config import settings

__all__ = ["settings"]
