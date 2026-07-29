"""Async database engine and session management.

Provides the SQLAlchemy async engine, session factory, and FastAPI-compatible
dependency generator.  Call ``init_db`` during application startup to create
all tables and ``close_db`` during shutdown to dispose of the engine.
"""

import logging
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base

logger = logging.getLogger(__name__)


def _create_engine(db_url: str):
    """Build an async SQLAlchemy engine configured appropriately for SQLite or PostgreSQL."""
    if db_url.startswith("sqlite"):
        return create_async_engine(
            db_url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False},
        )
    return create_async_engine(
        db_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


# ── Engine & Session Factory ─────────────────────────────────────────────
engine = _create_engine(str(settings.DATABASE_URL))

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables registered on ``Base.metadata``.

    If the primary database (e.g. PostgreSQL) is unreachable, falls back
    to SQLite so local development works seamlessly.
    """
    global engine, async_session_factory
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully using %s", settings.DATABASE_URL)
    except Exception as exc:
        if not str(settings.DATABASE_URL).startswith("sqlite"):
            logger.warning(
                "Primary database (%s) connection failed: %s. Falling back to local SQLite database (xpense_ai.db)...",
                settings.DATABASE_URL,
                exc,
            )
            fallback_url = "sqlite+aiosqlite:///./xpense_ai.db"
            await engine.dispose()
            engine = _create_engine(fallback_url)
            async_session_factory = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database initialized successfully using fallback SQLite database: %s", fallback_url)
        else:
            raise


async def close_db() -> None:
    """Dispose the engine and release all connections."""
    await engine.dispose()
