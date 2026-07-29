"""Integration tests for Analytics API endpoints."""

import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.db.session import get_session
from app.core.database import Base
from app.models.user import User
from app.core.security import hash_password, create_access_token

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.mark.anyio
async def test_analytics_endpoints():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_session():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    # Create test user
    async with async_session() as session:
        test_user = User(
            email="analytics_test@example.com",
            password_hash=hash_password("Password123!"),
            monthly_income=10000.0,
        )
        session.add(test_user)
        await session.commit()
        await session.refresh(test_user)

        token = create_access_token(data={"sub": str(test_user.id)})

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        # 1. Summary
        response = await client.get("/api/v1/analytics/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_income"] == 10000.0
        assert data["total_expense"] == 0.0
        assert data["net_cash_flow"] == 10000.0
        assert data["savings_rate"] == 100.0

        # 2. Categories
        response = await client.get("/api/v1/analytics/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data

        # 3. Trends
        response = await client.get("/api/v1/analytics/trends?timeframe=30d")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["timeframe"] == "30d"

    app.dependency_overrides.clear()
    await engine.dispose()
