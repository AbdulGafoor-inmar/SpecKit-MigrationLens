"""Board and work item query endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.models.schemas import (
    BoardColumn,
    BoardDetailResponse,
    BoardInfo,
    WorkItemInfo,
    WorkItemQueryRequest,
    WorkItemQueryResponse,
)
from app.services.ado_client import ADOClient

router = APIRouter()


def _parse_work_item(wi: dict) -> WorkItemInfo:
    """Map raw ADO work item dict to WorkItemInfo schema."""
    fields = wi.get("fields", {})
    assigned = fields.get("System.AssignedTo", {})
    assigned_name = assigned.get("displayName", "") if isinstance(assigned, dict) else str(assigned)

    links = wi.get("_links", {})
    html_url = links.get("html", {}).get("href", wi.get("url", ""))

    return WorkItemInfo(
        id=wi.get("id", 0),
        title=fields.get("System.Title", ""),
        state=fields.get("System.State", ""),
        work_item_type=fields.get("System.WorkItemType", ""),
        assigned_to=assigned_name,
        priority=fields.get("Microsoft.VSTS.Common.Priority", 0),
        tags=fields.get("System.Tags", ""),
        created_date=fields.get("System.CreatedDate", ""),
        changed_date=fields.get("System.ChangedDate", ""),
        url=html_url,
    )


@router.get("/boards", response_model=list[BoardInfo])
async def list_boards(
    project: str = Query("", description="ADO project name"),
    team: str = Query("", description="Team name (optional)"),
) -> list[BoardInfo]:
    """List all boards in a project."""
    settings = get_settings()
    proj = project or settings.ado_project

    if not proj:
        raise HTTPException(status_code=400, detail="Project name is required")

    client = ADOClient()
    boards = await client.list_boards(proj, team=team)

    return [
        BoardInfo(
            id=b.get("id", ""),
            name=b.get("name", ""),
            url=b.get("url", ""),
        )
        for b in boards
    ]


@router.get("/boards/{board_name}", response_model=BoardDetailResponse)
async def get_board_detail(
    board_name: str,
    project: str = Query("", description="ADO project name"),
    team: str = Query("", description="Team name (optional)"),
) -> BoardDetailResponse:
    """Get board columns and work items."""
    settings = get_settings()
    proj = project or settings.ado_project

    if not proj:
        raise HTTPException(status_code=400, detail="Project name is required")

    client = ADOClient()

    # Fetch columns and work items concurrently
    columns_raw = await client.get_board_columns(proj, board=board_name, team=team)
    work_items_raw = await client.list_work_items_on_board(proj, board=board_name, team=team)

    columns = [
        BoardColumn(
            id=c.get("id", ""),
            name=c.get("name", ""),
            item_limit=c.get("itemLimit", 0),
            state_mappings=c.get("stateMappings", {}),
        )
        for c in columns_raw
    ]

    work_items = [_parse_work_item(wi) for wi in work_items_raw]

    return BoardDetailResponse(
        board_name=board_name,
        columns=columns,
        work_items=work_items,
    )


@router.post("/boards/query", response_model=WorkItemQueryResponse)
async def query_work_items(request: WorkItemQueryRequest) -> WorkItemQueryResponse:
    """Execute a custom WIQL query against Azure DevOps."""
    settings = get_settings()
    proj = request.project or settings.ado_project

    if not proj:
        raise HTTPException(status_code=400, detail="Project name is required")

    if not request.wiql:
        raise HTTPException(status_code=400, detail="WIQL query is required")

    client = ADOClient()
    raw_items = await client.query_work_items(proj, request.wiql, top=request.top)

    work_items = [_parse_work_item(wi) for wi in raw_items]

    return WorkItemQueryResponse(count=len(work_items), work_items=work_items)


@router.get("/boards/workitems/list", response_model=WorkItemQueryResponse)
async def list_work_items(
    project: str = Query("", description="ADO project name"),
    work_item_type: str = Query("User Story", description="Work item type filter"),
    state: str = Query("", description="State filter (e.g. Active, New, Closed)"),
    tags: str = Query("", description="Tags filter"),
    top: int = Query(200, ge=1, le=500, description="Max items to return"),
) -> WorkItemQueryResponse:
    """List work items with optional filters using WIQL."""
    settings = get_settings()
    proj = project or settings.ado_project

    if not proj:
        raise HTTPException(status_code=400, detail="Project name is required")

    # Build dynamic WIQL
    conditions = [
        f"[System.TeamProject] = '{proj}'",
        f"[System.WorkItemType] = '{work_item_type}'",
    ]
    if state:
        conditions.append(f"[System.State] = '{state}'")
    if tags:
        conditions.append(f"[System.Tags] CONTAINS '{tags}'")

    where_clause = " AND ".join(conditions)
    wiql = (
        f"SELECT [System.Id], [System.Title], [System.State], "
        f"[System.AssignedTo], [Microsoft.VSTS.Common.Priority], "
        f"[System.Tags], [System.CreatedDate], [System.ChangedDate] "
        f"FROM WorkItems "
        f"WHERE {where_clause} "
        f"ORDER BY [System.ChangedDate] DESC"
    )

    client = ADOClient()
    raw_items = await client.query_work_items(proj, wiql, top=top)
    work_items = [_parse_work_item(wi) for wi in raw_items]

    return WorkItemQueryResponse(count=len(work_items), work_items=work_items)
