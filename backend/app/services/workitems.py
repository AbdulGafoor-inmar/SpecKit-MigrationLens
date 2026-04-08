"""Work item creation service for Azure DevOps."""

from __future__ import annotations

from typing import Any

import structlog

from app.config import get_settings
from app.models.schemas import (
    CreateStoryRequest,
    CreateStoryResponse,
    ComplianceResult,
    ComplianceStatus,
)
from app.services.ado_client import ADOClient
from app.services.cache import CacheManager

logger = structlog.get_logger()


class WorkItemService:
    """Creates Azure DevOps work items for migration tasks."""

    def _lookup_rule_details(
        self, request: CreateStoryRequest
    ) -> list[dict[str, str]]:
        """Look up full rule details from cached scan data."""
        if not request.failing_rules:
            return []

        settings = get_settings()
        org = request.organization or settings.ado_organization or "inmar"
        cache = CacheManager()
        data = cache.load(org)

        rule_details: list[dict[str, str]] = []
        rule_id_set = set(request.failing_rules)

        if data:
            repos = data.repositories or data.scan_results or []
            for repo_result in repos:
                if repo_result.repository.id == request.repo_id:
                    for cr in repo_result.compliance_results:
                        if cr.rule_id in rule_id_set:
                            rule_details.append({
                                "rule_id": cr.rule_id,
                                "rule_name": cr.rule_name,
                                "category": cr.category,
                                "severity": cr.severity.value if hasattr(cr.severity, 'value') else str(cr.severity),
                                "details": cr.details,
                                "file_path": cr.file_path or "",
                            })
                    break

        # If cache didn't have details, create minimal entries from rule IDs
        if not rule_details:
            for rule_id in request.failing_rules:
                rule_details.append({
                    "rule_id": rule_id,
                    "rule_name": rule_id,
                    "category": "",
                    "severity": "medium",
                    "details": "",
                    "file_path": "",
                })

        return rule_details

    async def create_migration_story(
        self, request: CreateStoryRequest
    ) -> CreateStoryResponse:
        """Create a User Story work item in ADO for migration.

        If an existing MigrationLens work item already exists for this repo,
        return it instead of creating a duplicate.
        """
        settings = get_settings()
        client = ADOClient()
        project = settings.ado_project or "Finance"
        org = request.organization or settings.ado_organization or "inmar"

        # ── Dedup: check for existing work item ─────────────────────────────
        existing = await client.find_migration_work_item(project, request.repo_name)
        if existing:
            work_item_id = existing.get("id", 0)
            existing_title = existing.get("fields", {}).get(
                "System.Title", f"[MigrationLens] {request.repo_name}"
            )
            url = f"https://dev.azure.com/{org}/{project}/_workitems/edit/{work_item_id}"
            logger.info(
                "work_item_reused",
                id=work_item_id,
                repo=request.repo_name,
            )
            return CreateStoryResponse(
                work_item_id=work_item_id,
                url=url,
                title=existing_title,
            )

        # ── No existing item — create a new one ─────────────────────────────
        score = request.score
        title = (
            f"[MigrationLens] Migrate {request.repo_name} to .NET 10 "
            f"(Score: {score:.0f}%)"
        )

        rule_details = self._lookup_rule_details(request)
        description = self._build_description(request, rule_details)

        result = await client.create_work_item(
            project=project,
            title=title,
            description=description,
            priority=request.priority,
            tags="MigrationLens,dotnet-migration,net10",
        )

        work_item_id = result.get("id", 0)
        url = f"https://dev.azure.com/{org}/{project}/_workitems/edit/{work_item_id}"

        logger.info("work_item_created", id=work_item_id, repo=request.repo_name)

        return CreateStoryResponse(
            work_item_id=work_item_id,
            url=url,
            title=title,
        )

    def _build_description(
        self, request: CreateStoryRequest, rule_details: list[dict[str, str]]
    ) -> str:
        """Build work item description from failing rules."""
        score = request.score
        lines = [
            f"<h2>Migration Required: {request.repo_name}</h2>",
            f"<p><strong>Current Compliance Score:</strong> {score:.1f}%</p>",
            f"<p><strong>Failing Rules:</strong> {len(rule_details)}</p>",
            "<h3>Compliance Gaps</h3>",
        ]

        if rule_details:
            lines.append("<table>")
            lines.append(
                "<tr><th>Rule</th><th>Category</th><th>Severity</th>"
                "<th>Details</th><th>File</th></tr>"
            )
            for rule in rule_details:
                lines.append(
                    f"<tr><td>{rule['rule_id']}: {rule['rule_name']}</td>"
                    f"<td>{rule['category']}</td>"
                    f"<td>{rule['severity']}</td>"
                    f"<td>{rule['details']}</td>"
                    f"<td>{rule['file_path']}</td></tr>"
                )
            lines.append("</table>")
        else:
            lines.append("<p>No detailed rule information available.</p>")

        lines.append("<h3>Acceptance Criteria</h3>")
        lines.append("<ul>")
        if rule_details:
            for rule in rule_details:
                rule_name = rule.get('rule_name', rule.get('rule_id', ''))
                lines.append(f"<li>{rule_name} — must pass after changes</li>")
        lines.append("<li>All critical compliance rules pass</li>")
        lines.append("<li>Overall compliance score ≥ 90%</li>")
        lines.append("<li>All unit tests pass with .NET 10</li>")
        lines.append("<li>CI/CD pipeline updated for .NET 10 SDK</li>")
        lines.append("</ul>")
        lines.append("<p><em>Generated by MigrationLens (AI scan against wiki rules)</em></p>")

        return "\n".join(lines)
