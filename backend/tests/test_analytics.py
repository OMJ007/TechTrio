"""Integration tests for the Analytics API endpoints."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models.transaction import Transaction, TransactionSource


async def test_summary_with_no_transactions(client):
    response = await client.get("/api/v1/analytics/summary")
    assert response.status_code == 200

    data = response.json()
    assert data["total_income"] == 10000.0
    assert data["total_expense"] == 0.0
    assert data["net_cash_flow"] == 10000.0
    assert data["savings_rate"] == 100.0


async def test_categories_and_trends_shapes(client):
    categories = await client.get("/api/v1/analytics/categories")
    assert categories.status_code == 200
    assert categories.json()["categories"] == []

    trends = await client.get("/api/v1/analytics/trends?timeframe=30d")
    assert trends.status_code == 200
    body = trends.json()
    assert body["timeframe"] == "30d"
    assert body["data"] == []


async def test_summary_and_breakdown_reflect_transactions(
    client, session_factory, test_user
):
    now = datetime.now(timezone.utc)
    async with session_factory() as session:
        session.add_all(
            [
                Transaction(
                    user_id=test_user.id,
                    amount=2000.0,
                    merchant="Swiggy",
                    category="Food",
                    payment_method="Card",
                    transaction_date=now,
                    source=TransactionSource.MANUAL,
                ),
                Transaction(
                    user_id=test_user.id,
                    amount=1000.0,
                    merchant="Uber",
                    category="Transport",
                    payment_method="UPI",
                    transaction_date=now,
                    source=TransactionSource.OCR,
                ),
            ]
        )
        await session.commit()

    summary = (await client.get("/api/v1/analytics/summary")).json()
    assert summary["total_expense"] == 3000.0
    assert summary["net_cash_flow"] == 7000.0
    assert summary["savings_rate"] == 70.0

    categories = (await client.get("/api/v1/analytics/categories")).json()["categories"]
    assert [c["category"] for c in categories] == ["Food", "Transport"]
    assert categories[0]["percentage"] == pytest.approx(66.7, abs=0.1)

    # The trends endpoint groups by day on both SQLite and PostgreSQL.
    trends = (await client.get("/api/v1/analytics/trends?timeframe=7d")).json()
    assert len(trends["data"]) == 1
    assert trends["data"][0]["total_spent"] == 3000.0


async def test_trends_excludes_transactions_outside_the_window(
    client, session_factory, test_user
):
    old = datetime.now(timezone.utc) - timedelta(days=45)
    async with session_factory() as session:
        session.add(
            Transaction(
                user_id=test_user.id,
                amount=500.0,
                merchant="Old Store",
                category="Shopping",
                payment_method="Cash",
                transaction_date=old,
                source=TransactionSource.MANUAL,
            )
        )
        await session.commit()

    trends = (await client.get("/api/v1/analytics/trends?timeframe=7d")).json()
    assert trends["data"] == []


async def test_analytics_requires_authentication(client):
    response = await client.get("/api/v1/analytics/summary", headers={"Authorization": ""})
    assert response.status_code == 401
