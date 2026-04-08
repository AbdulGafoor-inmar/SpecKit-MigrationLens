"""Repository endpoints — list and detail."""

from fastapi import APIRouter, HTTPException, Path, Query

from app.config import get_settings
from app.models.schemas import RepoScanResult, RepositoryInfo
from app.services.ado_client import ADOClient
from app.services.cache import CacheManager

router = APIRouter()


@router.get("/repos", response_model=list[RepositoryInfo])
async def list_repositories(
    organization: str = Query("", description="ADO organization name (uses default if empty)"),
    project: str = Query("", description="Optional project filter"),
) -> list[RepositoryInfo]:
    """List all Git repositories from Azure DevOps."""
    settings = get_settings()
    org = organization or settings.ado_organization
    proj = project or settings.ado_project

    if not org:
        raise HTTPException(status_code=400, detail="Organization name is required")

    # Check in-memory cache first to avoid hitting ADO on every page load
    from app.services.cache import mem_get, mem_set

    cache_key = f"repos_list:{org}:{proj}"
    cached_repos = mem_get(cache_key)
    if cached_repos is not None:
        return cached_repos

    client = ADOClient(organization=org)
    repos_raw = await client.list_repositories(proj)

    repos: list[RepositoryInfo] = []
    for r in repos_raw:
        default_branch = (
            r.get("defaultBranch", "refs/heads/main").replace("refs/heads/", "")
        )
        repos.append(
            RepositoryInfo(
                id=r.get("id", ""),
                name=r.get("name", ""),
                url=r.get("webUrl", r.get("remoteUrl", "")),
                default_branch=default_branch,
                project=r.get("project", {}).get("name", proj),
                dotnet_version="unknown",
                last_commit_date="",
            )
        )

    mem_set(cache_key, repos)
    return repos


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


@router.get("/repos/{repo_id}/branches")
async def list_repo_branches(
    repo_id: str = Path(..., description="Repository ID"),
    organization: str = Query("", description="ADO organization name"),
    project: str = Query("", description="ADO project name"),
) -> list[dict]:
    """List all branches for a repository."""
    settings = get_settings()
    org = organization or settings.ado_organization
    proj = project or settings.ado_project

    if not org:
        raise HTTPException(status_code=400, detail="Organization name is required")

    client = ADOClient(organization=org)
    branches = await client.list_branches(proj, repo_id)
    return branches
