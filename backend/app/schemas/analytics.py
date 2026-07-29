"""Pydantic schemas for the analytics domain — summary, categories, trends.

All monetary values are floats in the user's base currency.
Percentages are rounded to one decimal place.
"""

from pydantic import BaseModel, Field


class SummaryResponse(BaseModel):
    """High-level financial snapshot for the current month."""

    total_income: float = Field(
        ge=0,
        description="User's configured monthly income",
    )
    total_expense: float = Field(
        ge=0,
        description="Sum of all transaction amounts for the current month",
    )
    net_cash_flow: float = Field(
        description="total_income − total_expense (may be negative)",
    )
    savings_rate: float = Field(
        description="((total_income − total_expense) / total_income) × 100 — "
        "0 if total_income is 0; may be negative",
    )


class CategoryBreakdown(BaseModel):
    """A single category's spending for the current month."""

    category: str
    amount: float = Field(ge=0)
    percentage: float = Field(
        ge=0,
        description="Share of total monthly expense, as a percentage (0–100)",
    )


class CategoriesResponse(BaseModel):
    """Spending broken down by category."""

    categories: list[CategoryBreakdown]


class TrendPoint(BaseModel):
    """One day of spending in a time series."""

    date: str = Field(
        description="Calendar date in YYYY-MM-DD format",
    )
    total_spent: float = Field(
        ge=0,
        description="Total transaction amount for that day",
    )


class TrendsResponse(BaseModel):
    """Daily aggregated spending over a requested window."""

    timeframe: str = Field(
        pattern=r"^(7d|30d|90d)$",
        description="The requested look-back window",
    )
    data: list[TrendPoint] = Field(
        description="Time-ordered daily spending entries",
    )
