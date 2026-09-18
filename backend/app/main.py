"""FastAPI application entry point."""

import asyncio
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
from app.core.config import settings
from app.db.session import close_db, init_db
from app.rag import rag_status


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()

    # Warm the vector store in the background: building it downloads and loads
    # the embedding model, which would otherwise happen inside the first
    # advisor request. Failures are logged by the knowledge base itself and
    # degrade to keyword retrieval, so startup is never blocked on it.
    warmup = asyncio.create_task(asyncio.to_thread(rag_status))

    yield

    # Shutdown
    warmup.cancel()
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered financial advisor & expense platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware.
#
# A wildcard origin and ``allow_credentials=True`` are mutually exclusive in the
# CORS spec — browsers reject the response when both are sent, which silently
# breaks every cross-origin request from the deployed frontend.  With "*" the
# credentialed flag is therefore dropped; the API authenticates with a bearer
# token in a header, not a cookie, so nothing is lost.
_allow_all_origins = "*" in settings.ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=not _allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
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


@app.get("/", include_in_schema=False)
async def root():
    """Friendly landing payload so a bare GET / is not a 404."""
    return {
        "service": settings.APP_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.APP_NAME}