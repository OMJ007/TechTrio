"""Accounts API endpoints — CRUD for linked financial accounts."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.account import Account
from app.models.user import User
from app.schemas.account import AccountCreate, AccountRead

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


@router.get(
    "",
    response_model=list[AccountRead],
    summary="List linked financial accounts",
)
async def list_accounts(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Account]:
    stmt = select(Account).where(Account.user_id == current_user.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post(
    "",
    response_model=AccountRead,
    status_code=status.HTTP_201_CREATED,
    summary="Link a financial account",
)
async def create_account(
    data: AccountCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Account:
    acc = Account(
        user_id=current_user.id,
        name=data.name,
        account_type=data.account_type,
        balance=data.balance,
        institution=data.institution,
    )
    session.add(acc)
    await session.commit()
    await session.refresh(acc)
    return acc


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Disconnect an account",
)
async def delete_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    stmt = select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    res = await session.execute(stmt)
    acc = res.scalar_one_or_none()
    if acc:
        await session.delete(acc)
        await session.commit()
