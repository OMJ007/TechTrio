"""Account SQLAlchemy model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Account(Base):
    """A financial account (Bank, Credit Card, Investment) linked by a user."""

    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    account_type: Mapped[str] = mapped_column(
        String(50),
        default="Bank Account",
        nullable=False,
    )
    balance: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    institution: Mapped[str] = mapped_column(
        String(100),
        default="Primary Bank",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Account name={self.name!r} balance={self.balance}>"
