"""Transaction API endpoints — thin route handlers delegating to transaction_service."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionRead, TransactionUpdate
from app.services.transaction_service import (
    create_manual_transaction,
    delete_user_transaction,
    list_user_transactions,
    update_user_transaction,
)

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.get(
    "",
    response_model=list[TransactionRead],
    summary="List transactions for the authenticated user",
)
async def list_transactions(
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    search: str | None = Query(None, description="Search merchant or category"),
    category: str | None = Query(None, description="Filter by category"),
    payment_method: str | None = Query(None, description="Filter by payment method"),
    source: str | None = Query(None, description="Filter by source (ocr or manual)"),
    sort_by: str | None = Query("date_desc", description="Sort parameter"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Transaction]:
    """Retrieve transactions belonging to the current user."""
    return await list_user_transactions(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        search=search,
        category=category,
        payment_method=payment_method,
        source=source,
        sort_by=sort_by,
        session=session,
    )


@router.post(
    "",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Manually create a transaction",
)
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Transaction:
    """Manually add a transaction record."""
    return await create_manual_transaction(current_user, data, session)


@router.put(
    "/{transaction_id}",
    response_model=TransactionRead,
    summary="Manually update a transaction (category / amount)",
)
async def update_transaction(
    transaction_id: UUID,
    update_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Transaction:
    """Override category and/or amount of an existing transaction."""
    return await update_user_transaction(current_user.id, transaction_id, update_data, session)


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a transaction",
)
async def delete_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete an existing transaction belonging to the user."""
    await delete_user_transaction(current_user.id, transaction_id, session)
