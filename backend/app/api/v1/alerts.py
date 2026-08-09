"""Alerts API endpoints — notifications and anomalies."""

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertRead

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.get(
    "",
    response_model=list[AlertRead],
    summary="List security and spending alerts",
)
async def list_alerts(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Alert]:
    stmt = select(Alert).where(Alert.user_id == current_user.id).order_by(Alert.created_at.desc())
    res = await session.execute(stmt)
    alerts = list(res.scalars().all())

    # If no alerts exist yet for this user, seed default system welcome notification
    if not alerts:
        welcome_alert = Alert(
            user_id=current_user.id,
            alert_type="positive",
            title="Welcome to Xpense AI",
            message="Your AI financial intelligence workspace is active and monitoring spending anomalies.",
        )
        session.add(welcome_alert)
        await session.commit()
        await session.refresh(welcome_alert)
        alerts = [welcome_alert]

    return alerts


@router.put(
    "/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark all alerts as read",
)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    stmt = update(Alert).where(Alert.user_id == current_user.id).values(is_read=True)
    await session.execute(stmt)
    await session.commit()
    return {"message": "All alerts marked as read"}
