"""Transaction service — database CRUD operations for financial transactions."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionSource
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionUpdate


async def list_user_transactions(
    user_id: UUID,
    limit: int,
    offset: int,
    session: AsyncSession,
) -> list[Transaction]:
    """Retrieve transactions for a user ordered by date descending."""
    result = await session.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_manual_transaction(
    current_user: User,
    data: TransactionCreate,
    session: AsyncSession,
) -> Transaction:
    """Manually add a transaction record for a user."""
    txn_date = data.transaction_date or datetime.now(timezone.utc)

    transaction = Transaction(
        user_id=current_user.id,
        amount=data.amount,
        merchant=data.merchant,
        category=data.category,
        payment_method=data.payment_method,
        transaction_date=txn_date,
        source=TransactionSource.MANUAL,
        confidence_score=1.0,
    )
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)
    return transaction


async def create_ocr_transaction(
    current_user: User,
    amount: float,
    merchant: str,
    category: str,
    payment_method: str,
    transaction_date: datetime,
    confidence_score: float,
    session: AsyncSession,
) -> Transaction:
    """Persist an OCR-captured transaction record."""
    transaction = Transaction(
        user_id=current_user.id,
        amount=amount,
        merchant=merchant,
        category=category,
        payment_method=payment_method,
        transaction_date=transaction_date,
        source=TransactionSource.OCR,
        confidence_score=confidence_score,
    )
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)
    return transaction


async def update_user_transaction(
    user_id: UUID,
    transaction_id: UUID,
    update_data: TransactionUpdate,
    session: AsyncSession,
) -> Transaction:
    """Override category and/or amount for an existing transaction."""
    result = await session.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        ),
    )
    transaction = result.scalar_one_or_none()

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    has_changes = False
    if update_data.category is not None:
        transaction.category = update_data.category
        has_changes = True
    if update_data.amount is not None:
        transaction.amount = update_data.amount
        has_changes = True

    if not has_changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of 'category' or 'amount' must be provided",
        )

    transaction.confidence_score = 1.0

    await session.commit()
    await session.refresh(transaction)
    return transaction


async def delete_user_transaction(
    user_id: UUID,
    transaction_id: UUID,
    session: AsyncSession,
) -> None:
    """Delete an existing transaction belonging to the user."""
    result = await session.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        ),
    )
    transaction = result.scalar_one_or_none()

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    await session.delete(transaction)
    await session.commit()
