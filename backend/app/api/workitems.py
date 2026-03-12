"""Work item creation endpoint."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import CreateStoryRequest, CreateStoryResponse
from app.services.workitems import WorkItemService

router = APIRouter()


@router.post("/workitems", response_model=CreateStoryResponse, status_code=201)
async def create_work_item(request: CreateStoryRequest) -> CreateStoryResponse:
    """Create an Azure DevOps work item for migration tasks."""
    service = WorkItemService()

    try:
        return await service.create_migration_story(request)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to create work item in Azure DevOps: {str(e)}",
        )
