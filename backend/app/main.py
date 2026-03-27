"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import ai, app_settings, autofix, dashboard, export, health, migration, pr_review, repos, scan, workitems
# from app.api import boards, wiki  # Disabled — wiki data flows through migration endpoint

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("application_starting", version="1.0.0")
    yield
    logger.info("application_shutting_down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="MigrationLens API",
        description="AI-Powered .NET 10 / C# 14 Modernization Compliance Dashboard",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router, prefix="/api", tags=["Health"])
    app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
    app.include_router(scan.router, prefix="/api", tags=["Scan"])
    app.include_router(repos.router, prefix="/api", tags=["Repositories"])
    app.include_router(migration.router, prefix="/api", tags=["Migration"])
    app.include_router(workitems.router, prefix="/api", tags=["Work Items"])
    # app.include_router(boards.router, prefix="/api", tags=["Boards"])  # Disabled
    # app.include_router(wiki.router, prefix="/api", tags=["Wiki"])      # Disabled
    app.include_router(export.router, prefix="/api", tags=["Export"])
    app.include_router(app_settings.router, prefix="/api", tags=["Settings"])
    app.include_router(ai.router, prefix="/api", tags=["AI"])
    app.include_router(pr_review.router, prefix="/api", tags=["PR Review"])
    app.include_router(autofix.router, prefix="/api", tags=["Auto-Fix"])

    return app


app = create_app()
