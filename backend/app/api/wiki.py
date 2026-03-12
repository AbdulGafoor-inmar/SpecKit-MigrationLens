"""Wiki page endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.models.schemas import WikiInfo, WikiPage, WikiPageListResponse
from app.services.ado_client import ADOClient

router = APIRouter()


@router.get("/wiki", response_model=list[WikiInfo])
async def list_wikis(
    project: str = Query("", description="ADO project name (uses default if empty)"),
) -> list[WikiInfo]:
    """List all wikis in the project."""
    settings = get_settings()
    proj = project or settings.ado_project

    if not proj:
        raise HTTPException(status_code=400, detail="Project name is required")

    client = ADOClient()
    wikis = await client.list_wikis(proj)

    return [
        WikiInfo(
            id=w.get("id", ""),
            name=w.get("name", ""),
            type=w.get("type", ""),
            url=w.get("url", ""),
            project_id=w.get("projectId", ""),
            repository_id=w.get("repositoryId", ""),
        )
        for w in wikis
    ]


@router.get("/wiki/{wiki_id}/page", response_model=WikiPage)
async def get_wiki_page(
    wiki_id: str,
    path: str = Query("/", description="Page path within the wiki"),
    project: str = Query("", description="ADO project name"),
) -> WikiPage:
    """Get a single wiki page with content."""
    settings = get_settings()
    proj = project or settings.ado_project

    if not proj:
        raise HTTPException(status_code=400, detail="Project name is required")

    client = ADOClient()
    page = await client.get_wiki_page(proj, wiki_id, path=path)

    if page is None:
        raise HTTPException(status_code=404, detail=f"Wiki page not found: {path}")

    return WikiPage(
        id=page.get("id", 0),
        path=page.get("path", path),
        content=page.get("content", ""),
        git_item_path=page.get("gitItemPath", ""),
        remote_url=page.get("remoteUrl", ""),
        order=page.get("order", 0),
        sub_pages=[
            WikiPage(
                id=sp.get("id", 0),
                path=sp.get("path", ""),
                git_item_path=sp.get("gitItemPath", ""),
                order=sp.get("order", 0),
            )
            for sp in page.get("subPages", [])
        ],
    )


@router.get("/wiki/{wiki_id}/pages", response_model=WikiPageListResponse)
async def list_wiki_pages(
    wiki_id: str,
    path: str = Query("/", description="Root path to list from"),
    project: str = Query("", description="ADO project name"),
) -> WikiPageListResponse:
    """List all wiki pages (tree structure)."""
    settings = get_settings()
    proj = project or settings.ado_project

    if not proj:
        raise HTTPException(status_code=400, detail="Project name is required")

    client = ADOClient()
    pages = await client.list_wiki_pages(proj, wiki_id, path=path)

    return WikiPageListResponse(
        wiki_id=wiki_id,
        wiki_name="",
        pages=[
            WikiPage(
                id=p.get("id", 0),
                path=p.get("path", ""),
                git_item_path=p.get("gitItemPath", ""),
                remote_url=p.get("remoteUrl", ""),
                order=p.get("order", 0),
            )
            for p in pages
        ],
    )
