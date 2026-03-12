"""Dashboard endpoint — returns aggregated compliance summary."""

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import DashboardSummary
from app.services.cache import CacheManager

router = APIRouter()


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard(
    organization: str = Query(..., description="ADO organization name"),
    project: str = Query("", description="Optional project filter"),
) -> DashboardSummary:
    """Get the aggregated dashboard summary from cached scan data."""
    cache = CacheManager()
    data = cache.load(organization)

    if data is None:
        raise HTTPException(
            status_code=404,
            detail="No scan data found. Trigger a scan first.",
        )

    # If project filter is specified, filter scan results
    if project:
        data.scan_results = [
            r for r in data.scan_results if r.repository.project.lower() == project.lower()
        ]
        # Recompute summary stats
        if data.scan_results:
            scores = [r.overall_score for r in data.scan_results]
            data.total_repos = len(data.scan_results)
            data.average_score = round(sum(scores) / len(scores), 1)
            data.fully_compliant = sum(1 for s in scores if s >= 90)
            data.needs_migration = sum(1 for s in scores if s < 70)

    return data
