"""Dashboard endpoint — returns aggregated compliance summary."""

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.models.schemas import DashboardSummary
from app.services.cache import CacheManager

router = APIRouter()


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard(
    organization: str = Query("", description="ADO organization name (uses default if empty)"),
    project: str = Query("", description="Optional project filter"),
) -> DashboardSummary:
    """Get the aggregated dashboard summary from cached scan data."""
    settings = get_settings()
    org = organization or settings.ado_organization
    project = project or settings.ado_project

    if not org:
        raise HTTPException(status_code=400, detail="Organization name is required")

    cache = CacheManager()
    data = cache.load(org)

    if data is None:
        raise HTTPException(
            status_code=404,
            detail="No scan data found. Trigger a scan first.",
        )

    # Populate organization/project on the response
    data.organization = org
    data.project = project or ""

    # Ensure frontend-facing fields are populated from internal fields
    if not data.repositories and data.scan_results:
        data.repositories = data.scan_results
    if not data.total_repositories and data.total_repos:
        data.total_repositories = data.total_repos
        data.scanned_repositories = data.total_repos
    if not data.passing_repositories:
        data.passing_repositories = data.fully_compliant or sum(
            1 for r in data.repositories if r.overall_score >= 70
        )
    if not data.failing_repositories:
        data.failing_repositories = data.needs_migration or sum(
            1 for r in data.repositories if r.overall_score < 70
        )
    if not data.scan_timestamp and data.last_scan_time:
        data.scan_timestamp = data.last_scan_time

    # Compute category_averages if missing
    if not data.category_averages and data.repositories:
        cat_totals: dict[str, list[float]] = {}
        for r in data.repositories:
            for cs in (r.category_scores or r.categories or []):
                cat_totals.setdefault(cs.category, []).append(cs.score)
        data.category_averages = {
            cat: round(sum(vals) / len(vals), 1) for cat, vals in cat_totals.items()
        }

    # If project filter is specified, filter repositories
    if project:
        data.repositories = [
            r for r in data.repositories if r.repository.project.lower() == project.lower()
        ]
        # Recompute summary stats
        if data.repositories:
            scores = [r.overall_score for r in data.repositories]
            data.total_repositories = len(data.repositories)
            data.scanned_repositories = len(data.repositories)
            data.average_score = round(sum(scores) / len(scores), 1)
            data.passing_repositories = sum(1 for s in scores if s >= 70)
            data.failing_repositories = sum(1 for s in scores if s < 70)

    return data
