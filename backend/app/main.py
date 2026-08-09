"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.advisor import router as advisor_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.ocr import router as ocr_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.budgets import router as budgets_router
from app.api.v1.goals import router as goals_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.reports import router as reports_router
from app.config import settings
from app.db.session import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered financial advisor & expense platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(advisor_router)
app.include_router(analytics_router)
app.include_router(ocr_router)
app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(goals_router)
app.include_router(accounts_router)
app.include_router(alerts_router)
app.include_router(reports_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.APP_NAME}