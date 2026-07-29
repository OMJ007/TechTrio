"""User SQLAlchemy model.

Represents a registered user of the Xpense AI platform.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """A registered user account.

    Each user has a unique email, an encrypted password, financial profile
    fields, and a one-to-many relationship with :class:`Transaction`.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    monthly_income: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    risk_profile: Mapped[str] = mapped_column(
        String(20),
        default="moderate",
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────
    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # ── Timestamps ─────────────────────────────────────────────────
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
        return f"<User id={self.id} email={self.email!r}>"
