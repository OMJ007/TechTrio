"""Budgets API endpoints — CRUD for category budget limits."""

from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate

router = APIRouter(prefix="/api/v1/budgets", tags=["budgets"])


@router.get(
    "",
    response_model=list[BudgetRead],
    summary="List category budget limits for the current user",
)
async def list_budgets(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """List budgets and compute actual monthly spending against targets."""
    # 1. Fetch budgets
    stmt = select(Budget).where(Budget.user_id == current_user.id)
    result = await session.execute(stmt)
    budgets = result.scalars().all()

    # 2. Compute spending per category for current month
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    tx_stmt = (
        select(Transaction.category, func.sum(Transaction.amount))
        .where(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= first_of_month,
        )
        .group_by(Transaction.category)
    )
    tx_result = await session.execute(tx_stmt)
    category_spent = {row[0]: float(row[1] or 0.0) for row in tx_result.all()}

    output = []
    for b in budgets:
        spent = category_spent.get(b.category, 0.0)
        pct = round((spent / b.target_amount * 100), 1) if b.target_amount > 0 else 0.0
        output.append({
            "id": b.id,
            "user_id": b.user_id,
            "category": b.category,
            "target_amount": b.target_amount,
            "spent_amount": spent,
            "percentage_used": pct,
            "period": b.period,
            "created_at": b.created_at,
            "updated_at": b.updated_at,
        })

    return output


@router.post(
    "",
    response_model=BudgetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a category budget limit",
)
async def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    # Check if budget for category already exists
    stmt = select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.category == data.category,
    )
    res = await session.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        existing.target_amount = data.target_amount
        await session.commit()
        await session.refresh(existing)
        b = existing
    else:
        b = Budget(
            user_id=current_user.id,
            category=data.category,
            target_amount=data.target_amount,
            period=data.period,
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)

    return {
        "id": b.id,
        "user_id": b.user_id,
        "category": b.category,
        "target_amount": b.target_amount,
        "spent_amount": 0.0,
        "percentage_used": 0.0,
        "period": b.period,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
    }


@router.put(
    "/{budget_id}",
    response_model=BudgetRead,
    summary="Update budget limit target",
)
async def update_budget(
    budget_id: UUID,
    data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    stmt = select(Budget).where(Budget.id == budget_id, Budget.user_id == current_user.id)
    res = await session.execute(stmt)
    b = res.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")

    if data.target_amount is not None:
        b.target_amount = data.target_amount
    if data.category is not None:
        b.category = data.category

    await session.commit()
    await session.refresh(b)
    return {
        "id": b.id,
        "user_id": b.user_id,
        "category": b.category,
        "target_amount": b.target_amount,
        "spent_amount": 0.0,
        "percentage_used": 0.0,
        "period": b.period,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
    }


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a budget limit",
)
async def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    stmt = select(Budget).where(Budget.id == budget_id, Budget.user_id == current_user.id)
    res = await session.execute(stmt)
    b = res.scalar_one_or_none()
    if b:
        await session.delete(b)
        await session.commit()
