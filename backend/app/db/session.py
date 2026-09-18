"""Async database engine and session management.

Provides the SQLAlchemy async engine, session factory, and FastAPI-compatible
dependency generator.  Call ``init_db`` during application startup to create
all tables and ``close_db`` during shutdown to dispose of the engine.
"""

import logging
from collections.abc import AsyncGenerator

from sqlalchemy import inspect, text
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


def _sync_added_columns(conn) -> None:
    """Add columns that exist on the models but not yet in the database.

    ``create_all`` only creates missing *tables*, so a table that predates a
    model change keeps its old shape.  This project has no migration tool, so
    new nullable/defaulted columns are patched in here instead.
    """
    inspector = inspect(conn)

    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue

        existing = {col["name"] for col in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing:
                continue

            # Only additive, safe changes: the column must have a value the
            # database can backfill existing rows with.
            if not column.nullable and column.server_default is None:
                logger.warning(
                    "Skipping auto-add of non-nullable column %s.%s (no server default); "
                    "a manual migration is required.",
                    table.name,
                    column.name,
                )
                continue

            ddl = column.type.compile(conn.dialect)
            if not column.nullable:
                default = column.server_default.arg
                ddl += f" NOT NULL DEFAULT '{default}'"

            conn.execute(
                text(f'ALTER TABLE {table.name} ADD COLUMN "{column.name}" {ddl}')
            )
            logger.info("Added missing column %s.%s", table.name, column.name)


async def init_db() -> None:
    """Create all tables registered on ``Base.metadata``.

    If the primary database (e.g. PostgreSQL) is unreachable, falls back
    to SQLite so local development works seamlessly.
    """
    global engine, async_session_factory
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_sync_added_columns)
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
                await conn.run_sync(_sync_added_columns)
            logger.info("Database initialized successfully using fallback SQLite database: %s", fallback_url)
        else:
            raise


async def close_db() -> None:
    """Dispose the engine and release all connections."""
    await engine.dispose()
