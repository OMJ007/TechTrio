"""Analytics service — DB queries and computations for financial analytics."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.analytics import (
    CategoriesResponse,
    CategoryBreakdown,
    SummaryResponse,
    TrendPoint,
    TrendsResponse,
)


def _now_utc() -> datetime:
    """Return current aware UTC datetime."""
    return datetime.now(timezone.utc)


def _dialect_name(session: AsyncSession) -> str:
    """Return the SQL dialect backing *session* (``"sqlite"``, ``"postgresql"``…).

    ``AsyncSession.bind`` is not part of the public async API and is absent on
    sessions built by ``async_sessionmaker``, so the bind is resolved through
    ``get_bind()`` and any failure degrades to an empty string rather than
    raising mid-query.
    """
    try:
        bind = session.get_bind()
    except Exception:  # noqa: BLE001 - dialect detection must never break a query
        return ""
    dialect = getattr(bind, "dialect", None)
    return getattr(dialect, "name", "") or ""


async def get_expense_summary(
    current_user: User,
    period: str,
    session: AsyncSession,
) -> SummaryResponse:
    """Calculate high-level financial metrics for the specified period."""
    now = _now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_income = max(current_user.monthly_income, 0.0)

    stmt = select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
        Transaction.user_id == current_user.id
    )
    if period == "month":
        stmt = stmt.where(Transaction.transaction_date >= month_start)

    exp_result = await session.execute(stmt)
    total_expense: float = float(exp_result.scalar_one())

    net_cash_flow = total_income - total_expense
    savings_rate: float = (
        round((net_cash_flow / total_income) * 100, 1) if total_income > 0 else 0.0
    )

    return SummaryResponse(
        total_income=total_income,
        total_expense=total_expense,
        net_cash_flow=round(net_cash_flow, 2),
        savings_rate=savings_rate,
    )


async def get_category_breakdown(
    current_user: User,
    period: str,
    session: AsyncSession,
) -> CategoriesResponse:
    """Group spending by category for the specified period."""
    now = _now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    stmt = select(
        Transaction.category,
        func.coalesce(func.sum(Transaction.amount), 0.0).label("amount"),
    ).where(
        Transaction.user_id == current_user.id
    )
    if period == "month":
        stmt = stmt.where(Transaction.transaction_date >= month_start)

    stmt = stmt.group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc())

    rows = await session.execute(stmt)
    records = rows.all()

    total_expense = sum(float(r.amount) for r in records) if records else 0.0

    categories = [
        CategoryBreakdown(
            category=r.category,
            amount=round(float(r.amount), 2),
            percentage=(
                round((float(r.amount) / total_expense) * 100, 1)
                if total_expense > 0
                else 0.0
            ),
        )
        for r in records
    ]

    return CategoriesResponse(categories=categories)


async def get_spending_trends(
    current_user: User,
    timeframe: str,
    session: AsyncSession,
) -> TrendsResponse:
    """Return daily aggregated spending over the timeframe."""
    now = _now_utc()
    delta_days = {"7d": 7, "30d": 30, "90d": 90}
    since = now - timedelta(days=delta_days.get(timeframe, 30))

    if _dialect_name(session) == "sqlite":
        day_col = func.strftime("%Y-%m-%d", Transaction.transaction_date).label("day")
    else:
        day_col = func.date_trunc("day", Transaction.transaction_date).label("day")

    sum_col = func.coalesce(func.sum(Transaction.amount), 0.0).label("total_spent")

    rows = await session.execute(
        select(day_col, sum_col)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= since,
        )
        .group_by(day_col)
        .order_by(day_col),
    )
    records = rows.all()

    data = [
        TrendPoint(
            date=r.day.strftime("%Y-%m-%d") if isinstance(r.day, datetime) else str(r.day) if r.day else "",
            total_spent=round(float(r.total_spent), 2),
        )
        for r in records
    ]

    return TrendsResponse(timeframe=timeframe, data=data)


async def build_user_financial_summary(
    current_user: User,
    session: AsyncSession,
) -> str:
    """Build a concise text snapshot of user income and month expenses for advisor prompts."""
    now = _now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    income = max(current_user.monthly_income, 0.0)

    rows = await session.execute(
        select(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0.0).label("total"),
        ).where(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= month_start,
        ).group_by(Transaction.category),
    )
    records = rows.all()
    total_expense = sum(float(r.total) for r in records)

    lines = [f"Monthly Income: ₹{income:,.2f}"]
    if records:
        lines.append("Current Month Expenses:")
        for r in sorted(records, key=lambda x: float(x.total), reverse=True):
            pct = (float(r.total) / total_expense * 100) if total_expense > 0 else 0
            lines.append(f"  - {r.category}: ₹{float(r.total):,.2f} ({pct:.1f}%)")
        lines.append(f"  Total: ₹{total_expense:,.2f}")
    else:
        lines.append("No expenses recorded this month.")

    return "\n".join(lines)
