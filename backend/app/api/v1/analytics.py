"""Analytics API endpoints — thin route handlers delegating to analytics_service."""

from fastapi import APIRouter, Depends, Query

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.user import User
from app.schemas.analytics import CategoriesResponse, SummaryResponse, TrendsResponse
from app.services.analytics_service import (
    get_category_breakdown,
    get_expense_summary,
    get_spending_trends,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get(
    "/summary",
    response_model=SummaryResponse,
    summary="Monthly or all-time financial snapshot",
)
async def get_summary(
    period: str = Query("month", pattern=r"^(month|all)$", description="Period filter: month or all"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SummaryResponse:
    """Return high-level financial summary metrics."""
    return await get_expense_summary(current_user, period, session)


@router.get(
    "/categories",
    response_model=CategoriesResponse,
    summary="Spending by category",
)
async def get_categories(
    period: str = Query("month", pattern=r"^(month|all)$", description="Period filter: month or all"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CategoriesResponse:
    """Group spending by category."""
    return await get_category_breakdown(current_user, period, session)


@router.get(
    "/trends",
    response_model=TrendsResponse,
    summary="Daily spending time series",
)
async def get_trends(
    timeframe: str = Query(
        "30d",
        pattern=r"^(7d|30d|90d)$",
        description="Look-back window: 7d, 30d, or 90d",
    ),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TrendsResponse:
    """Return daily aggregated spending over requested timeframe."""
    return await get_spending_trends(current_user, timeframe, session)
