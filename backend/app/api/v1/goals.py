"""Goals API endpoints — CRUD for savings targets."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.goal import Goal
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalRead, GoalUpdate

router = APIRouter(prefix="/api/v1/goals", tags=["goals"])


@router.get(
    "",
    response_model=list[GoalRead],
    summary="List savings goals for the current user",
)
async def list_goals(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    stmt = select(Goal).where(Goal.user_id == current_user.id)
    res = await session.execute(stmt)
    goals = res.scalars().all()

    output = []
    for g in goals:
        pct = round((g.current_amount / g.target_amount * 100), 1) if g.target_amount > 0 else 0.0
        output.append({
            "id": g.id,
            "user_id": g.user_id,
            "name": g.name,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount,
            "percentage_completed": pct,
            "category": g.category,
            "created_at": g.created_at,
            "updated_at": g.updated_at,
        })
    return output


@router.post(
    "",
    response_model=GoalRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a savings goal",
)
async def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    g = Goal(
        user_id=current_user.id,
        name=data.name,
        target_amount=data.target_amount,
        current_amount=data.current_amount,
        category=data.category,
    )
    session.add(g)
    await session.commit()
    await session.refresh(g)

    pct = round((g.current_amount / g.target_amount * 100), 1) if g.target_amount > 0 else 0.0
    return {
        "id": g.id,
        "user_id": g.user_id,
        "name": g.name,
        "target_amount": g.target_amount,
        "current_amount": g.current_amount,
        "percentage_completed": pct,
        "category": g.category,
        "created_at": g.created_at,
        "updated_at": g.updated_at,
    }


@router.put(
    "/{goal_id}",
    response_model=GoalRead,
    summary="Update a savings goal",
)
async def update_goal(
    goal_id: UUID,
    data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    stmt = select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    res = await session.execute(stmt)
    g = res.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")

    if data.name is not None:
        g.name = data.name
    if data.target_amount is not None:
        g.target_amount = data.target_amount
    if data.current_amount is not None:
        g.current_amount = data.current_amount
    if data.category is not None:
        g.category = data.category

    await session.commit()
    await session.refresh(g)

    pct = round((g.current_amount / g.target_amount * 100), 1) if g.target_amount > 0 else 0.0
    return {
        "id": g.id,
        "user_id": g.user_id,
        "name": g.name,
        "target_amount": g.target_amount,
        "current_amount": g.current_amount,
        "percentage_completed": pct,
        "category": g.category,
        "created_at": g.created_at,
        "updated_at": g.updated_at,
    }


@router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a savings goal",
)
async def delete_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    stmt = select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    res = await session.execute(stmt)
    g = res.scalar_one_or_none()
    if g:
        await session.delete(g)
        await session.commit()
