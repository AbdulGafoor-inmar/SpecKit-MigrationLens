"""Repository detail endpoint."""

from fastapi import APIRouter, HTTPException, Path, Query

from app.models.schemas import RepoScanResult
from app.services.cache import CacheManager

router = APIRouter()


@router.get("/repos/{repo_id}", response_model=RepoScanResult)
async def get_repo_detail(
    repo_id: str = Path(..., description="Repository ID"),
    organization: str = Query("", description="ADO organization name"),
) -> RepoScanResult:
    """Get detailed compliance results for a specific repository."""
    cache = CacheManager()

    # Try to find the repo in cached data
    # If no organization specified, search all cached data
    if organization:
        data = cache.load(organization)
        if data:
            for result in data.scan_results:
                if result.repository.id == repo_id:
                    return result

    # Search all cache files
    import os
    from pathlib import Path as FilePath

    cache_dir = FilePath(cache._cache_dir)
    if cache_dir.exists():
        for f in cache_dir.glob("dashboard_*.json"):
            if f.name.endswith(".meta.json"):
                continue
            org_name = f.stem.replace("dashboard_", "")
            data = cache.load(org_name)
            if data:
                for result in data.scan_results:
                    if result.repository.id == repo_id:
                        return result

    raise HTTPException(status_code=404, detail="Repository not found in scan data")
