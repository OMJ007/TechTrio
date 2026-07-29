"""Re-export Base from core.database for model imports.

All models should import Base from here to maintain a single source of truth.
"""

from app.core.database import Base

__all__ = ["Base"]
