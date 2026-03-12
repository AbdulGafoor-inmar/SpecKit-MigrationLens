"""Scan endpoints — trigger scans and check progress."""

import asyncio

from fastapi import APIRouter, HTTPException

from app.models.schemas import ScanProgress, ScanRequest, ScanStartResponse
from app.services.scanner import get_scanner

router = APIRouter()


@router.post("/scan", response_model=ScanStartResponse, status_code=202)
async def start_scan(request: ScanRequest) -> ScanStartResponse:
    """Trigger a compliance scan of repositories."""
    scanner = get_scanner()

    if scanner.is_scanning:
        raise HTTPException(status_code=409, detail="A scan is already in progress")

    # Start scan in background
    async def _run_scan():
        await scanner.scan_all(
            organization=request.organization,
            project=request.project,
            pat_token=request.pat_token,
        )

    asyncio.create_task(_run_scan())

    # Return immediately — client polls /scan/progress
    return ScanStartResponse(message="Scan started")


@router.get("/scan/progress", response_model=ScanProgress)
async def get_scan_progress() -> ScanProgress:
    """Get current scan progress."""
    scanner = get_scanner()
    return scanner.progress
