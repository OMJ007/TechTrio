"""Reports API endpoints — CSV export and financial summaries."""

import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get(
    "/export",
    summary="Export transactions as CSV file",
)
async def export_csv(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate and stream a CSV file containing all user transactions."""
    stmt = select(Transaction).where(Transaction.user_id == current_user.id).order_by(Transaction.transaction_date.desc())
    res = await session.execute(stmt)
    transactions = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Merchant", "Category", "Amount", "Payment Method", "Date", "Source"])

    for t in transactions:
        writer.writerow([
            str(t.id),
            t.merchant,
            t.category,
            t.amount,
            t.payment_method,
            t.transaction_date.strftime("%Y-%m-%d"),
            t.source.value if hasattr(t.source, "value") else str(t.source),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=xpense_transactions.csv"},
    )
