"""Transaction service — database CRUD operations for financial transactions."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionSource
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionUpdate


async def list_user_transactions(
    user_id: UUID,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
    category: str | None = None,
    payment_method: str | None = None,
    source: str | None = None,
    sort_by: str | None = "date_desc",
    session: AsyncSession = None,
) -> list[Transaction]:
    """Retrieve transactions for a user with flexible filtering & sorting."""
    stmt = select(Transaction).where(Transaction.user_id == user_id)

    if search:
        search_filter = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Transaction.merchant.ilike(search_filter),
                Transaction.category.ilike(search_filter),
            )
        )

    if category and category.lower() != "all":
        stmt = stmt.where(Transaction.category == category)

    if payment_method and payment_method.lower() != "all":
        stmt = stmt.where(Transaction.payment_method == payment_method)

    if source:
        stmt = stmt.where(Transaction.source == source)

    if sort_by == "amount_desc":
        stmt = stmt.order_by(Transaction.amount.desc())
    elif sort_by == "amount_asc":
        stmt = stmt.order_by(Transaction.amount.asc())
    elif sort_by == "date_asc":
        stmt = stmt.order_by(Transaction.transaction_date.asc())
    else:
        stmt = stmt.order_by(Transaction.transaction_date.desc())

    stmt = stmt.offset(offset).limit(limit)
    result = await session.execute(stmt)
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
