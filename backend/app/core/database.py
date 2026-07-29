"""Declarative base for all SQLAlchemy ORM models.

Import ``Base`` from this module when defining new models:

    from app.core.database import Base
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all Xpense AI database models."""
