"""Scan endpoints — trigger scans and check progress."""

import asyncio

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.models.schemas import ScanProgress, ScanRequest, ScanStartResponse
from app.services.scanner import get_scanner

router = APIRouter()


@router.post("/scan", response_model=ScanStartResponse, status_code=202)
async def start_scan(request: ScanRequest) -> ScanStartResponse:
    """Trigger a compliance scan of repositories."""
    settings = get_settings()
    org = request.organization or settings.ado_organization
    project = request.project or settings.ado_project

    if not org:
        raise HTTPException(status_code=400, detail="Organization name is required")

    scanner = get_scanner()

    if scanner.is_scanning:
        raise HTTPException(status_code=409, detail="A scan is already in progress")

    # Start scan in background
    async def _run_scan():
        await scanner.scan_all(
            organization=org,
            project=project,
            pat_token=request.pat_token,
            repo_ids=request.repo_ids,
            repo_branches=request.repo_branches,
        )

    asyncio.create_task(_run_scan())

    # Return immediately — client polls /scan/progress
    return ScanStartResponse(message="Scan started")


@router.post("/scan/stop")
async def stop_scan() -> dict:
    """Stop an in-progress scan or reset stuck scan state."""
    scanner = get_scanner()
    if scanner.is_scanning:
        scanner.cancel()
        return {"message": "Scan stop requested"}
    else:
        # Force-reset in case scan state is stuck
        scanner.force_reset()
        return {"message": "Scan state reset"}


@router.get("/scan/progress", response_model=ScanProgress)
async def get_scan_progress() -> ScanProgress:
    """Get current scan progress."""
    scanner = get_scanner()
    return scanner.progress
