"""Export endpoint — JSON and CSV report downloads."""

import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.models.enums import ExportFormat
from app.services.cache import CacheManager

router = APIRouter()


@router.get("/export")
async def export_report(
    organization: str = Query("", description="ADO organization name (uses default if empty)"),
    format: ExportFormat = Query(ExportFormat.JSON, description="Export format"),
):
    """Export compliance report as JSON or CSV."""
    settings = get_settings()
    org = organization or settings.ado_organization

    if not org:
        raise HTTPException(status_code=400, detail="Organization name is required")

    cache = CacheManager()
    data = cache.load(org)

    if data is None:
        raise HTTPException(status_code=404, detail="No scan data to export")

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")

    if format == ExportFormat.JSON:
        content = data.model_dump_json(indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="migration-report-{date_str}.json"'
            },
        )

    elif format == ExportFormat.CSV:
        output = io.StringIO()
        writer = csv.writer(output)

        # Header row
        writer.writerow([
            "Repository",
            "Project",
            ".NET Version",
            "Overall Score",
            "Complexity",
            "Project Count",
            "SDK & Runtime",
            "Language Features",
            "Project Configuration",
            "NuGet & Dependencies",
            "Code Patterns",
            "DevOps & CI/CD",
            "Performance & AOT",
            "Scan Timestamp",
        ])

        # Data rows
        results = data.repositories or data.scan_results
        for result in results:
            cat_scores = {cs.category: cs.score for cs in result.category_scores}
            writer.writerow([
                result.repository.name,
                result.repository.project,
                result.repository.dotnet_version,
                result.overall_score,
                result.complexity,
                result.project_count,
                cat_scores.get("SDK & Runtime", "N/A"),
                cat_scores.get("Language Features", "N/A"),
                cat_scores.get("Project Configuration", "N/A"),
                cat_scores.get("NuGet & Dependencies", "N/A"),
                cat_scores.get("Code Patterns", "N/A"),
                cat_scores.get("DevOps & CI/CD", "N/A"),
                cat_scores.get("Performance & AOT", "N/A"),
                result.scan_timestamp,
            ])

        csv_content = output.getvalue()
        return StreamingResponse(
            io.BytesIO(csv_content.encode("utf-8")),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="migration-report-{date_str}.csv"'
            },
        )
