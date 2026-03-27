"""Auto-Fix pipeline API — SSE streaming endpoint for real-time progress."""

from __future__ import annotations

import json

from fastapi import APIRouter, Path, Query
from fastapi.responses import StreamingResponse

from app.models.schemas import AutoFixRequest
from app.services.autofix import AutoFixPipeline

router = APIRouter()


@router.post("/autofix/{repo_id}")
async def start_autofix(
    repo_id: str = Path(..., description="Repository ID"),
    request: AutoFixRequest = AutoFixRequest(),
) -> StreamingResponse:
    """Start the AI Auto-Fix pipeline for a repository.

    Returns a Server-Sent Events (SSE) stream with real-time step updates.
    Each event is a JSON object with step number, name, status, and details.

    Final event has `event: done` with the summary.
    """

    async def event_stream():
        pipeline = AutoFixPipeline()
        steps_completed = []

        try:
            async for step in pipeline.run(repo_id, request):
                steps_completed.append(step)
                # Send as SSE event
                data = step.model_dump()
                yield f"data: {json.dumps(data)}\n\n"

            # Send final summary event
            summary = {
                "type": "done",
                "steps": [s.model_dump() for s in steps_completed],
                "total_steps": len(steps_completed),
            }
            yield f"event: done\ndata: {json.dumps(summary)}\n\n"
        except Exception as exc:
            # Send an error event so the frontend can display it gracefully
            # instead of seeing ERR_INCOMPLETE_CHUNKED_ENCODING
            import traceback
            traceback.print_exc()
            error_step = {
                "step": 0,
                "name": "Pipeline Error",
                "status": "failed",
                "details": f"Unexpected error: {str(exc)[:300]}",
                "url": "",
                "data": {},
            }
            yield f"data: {json.dumps(error_step)}\n\n"
            summary = {
                "type": "done",
                "steps": [s.model_dump() for s in steps_completed] + [error_step],
                "total_steps": len(steps_completed) + 1,
            }
            yield f"event: done\ndata: {json.dumps(summary)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
