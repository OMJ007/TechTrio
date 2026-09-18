"""Tests for transaction listing, filtering, and the source-enum coercion."""

from datetime import datetime, timezone

import pytest

from app.models.transaction import Transaction, TransactionSource
from app.services.transaction_service import _coerce_source


@pytest.fixture
async def seeded(session_factory, test_user):
    now = datetime.now(timezone.utc)
    async with session_factory() as session:
        session.add_all(
            [
                Transaction(
                    user_id=test_user.id,
                    amount=250.0,
                    merchant="Swiggy",
                    category="Food",
                    payment_method="UPI",
                    transaction_date=now,
                    source=TransactionSource.MANUAL,
                ),
                Transaction(
                    user_id=test_user.id,
                    amount=1800.0,
                    merchant="Big Bazaar",
                    category="Groceries",
                    payment_method="Card",
                    transaction_date=now,
                    source=TransactionSource.OCR,
                ),
            ]
        )
        await session.commit()
    return test_user


def test_coerce_source_maps_query_strings_to_enum_members():
    assert _coerce_source("ocr") is TransactionSource.OCR
    assert _coerce_source("OCR") is TransactionSource.OCR
    assert _coerce_source("manual") is TransactionSource.MANUAL
    # "all", empty, and unknown values mean "do not filter".
    assert _coerce_source("all") is None
    assert _coerce_source("") is None
    assert _coerce_source(None) is None
    assert _coerce_source("nonsense") is None


async def test_list_returns_every_transaction(client, seeded):
    response = await client.get("/api/v1/transactions")
    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_filter_by_source_ocr(client, seeded):
    """The receipts page calls ?source=ocr — it must not return everything."""
    response = await client.get("/api/v1/transactions?source=ocr")
    assert response.status_code == 200

    body = response.json()
    assert len(body) == 1
    assert body[0]["merchant"] == "Big Bazaar"
    assert body[0]["source"] == "ocr"


async def test_filter_by_source_manual(client, seeded):
    body = (await client.get("/api/v1/transactions?source=manual")).json()
    assert [t["merchant"] for t in body] == ["Swiggy"]


async def test_search_and_category_filters(client, seeded):
    by_search = (await client.get("/api/v1/transactions?search=swig")).json()
    assert [t["merchant"] for t in by_search] == ["Swiggy"]

    by_category = (await client.get("/api/v1/transactions?category=Groceries")).json()
    assert [t["merchant"] for t in by_category] == ["Big Bazaar"]


async def test_sort_by_amount(client, seeded):
    body = (await client.get("/api/v1/transactions?sort_by=amount_desc")).json()
    assert [t["amount"] for t in body] == [1800.0, 250.0]


async def test_update_requires_a_field(client, seeded):
    listed = (await client.get("/api/v1/transactions")).json()
    txn_id = listed[0]["id"]

    empty = await client.put(f"/api/v1/transactions/{txn_id}", json={})
    assert empty.status_code == 400

    updated = await client.put(
        f"/api/v1/transactions/{txn_id}", json={"category": "Entertainment"}
    )
    assert updated.status_code == 200
    assert updated.json()["category"] == "Entertainment"


async def test_delete_missing_transaction_is_404(client, seeded):
    missing = "00000000-0000-0000-0000-000000000000"
    response = await client.delete(f"/api/v1/transactions/{missing}")
    assert response.status_code == 404
