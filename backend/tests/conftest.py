"""Shared pytest fixtures.

The suite runs against an in-memory SQLite database and never touches the
network: the advisor/LLM calls are not exercised here, and the knowledge base
is pointed at a temporary directory so tests cannot disturb ``chroma_db/``.
"""

import os
import tempfile

import pytest

# Deterministic settings must be in place before app.core.config is imported.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-key-that-is-long-enough-for-hs256")
os.environ.setdefault("CHROMA_DIR", os.path.join(tempfile.gettempdir(), "xpense_test_chroma"))
os.environ.setdefault("RAG_COLLECTION", "test_finance_knowledge")

import pytest_asyncio  # noqa: E402  (imported after the env is set)
from sqlalchemy.pool import StaticPool  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app.core.database import Base  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """Run anyio-marked tests on asyncio only."""
    return "asyncio"


@pytest_asyncio.fixture
async def session_factory():
    """Create a fresh in-memory schema per test.

    A single connection is shared for the lifetime of the fixture because an
    in-memory SQLite database vanishes when its last connection closes.
    """
    engine = create_async_engine(
        TEST_DB_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        yield factory
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def test_user(session_factory) -> User:
    """Persist a user with a known income for analytics assertions."""
    async with session_factory() as session:
        user = User(
            email="analytics_test@example.com",
            password_hash=hash_password("Password123!"),
            monthly_income=10000.0,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def client(session_factory, test_user):
    """An httpx client bound to the app, authenticated as ``test_user``."""
    from httpx import ASGITransport, AsyncClient

    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    token = create_access_token(data={"sub": str(test_user.id)})

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        headers={"Authorization": f"Bearer {token}"},
    ) as async_client:
        yield async_client

    app.dependency_overrides.clear()
