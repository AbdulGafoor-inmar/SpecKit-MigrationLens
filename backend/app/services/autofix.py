"""AI Auto-Fix Pipeline — orchestrates the 6-step automated migration flow.

Steps:
  1. Create ADO User Story (work item)
  2. Generate AI code fixes for failing rules
  3. Create feature branch from default branch
  4. Push AI-generated changes as a single commit
  5. Create Pull Request linked to the story
  6. Run AI PR Review and post comment
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any

import structlog

from app.config import get_settings
from app.models.schemas import (
    AutoFixRequest,
    AutoFixResult,
    AutoFixStepStatus,
    CreateStoryRequest,
    ComplianceResult,
)
from app.services.ado_client import ADOClient
from app.services import ai_service, ai_compliance
from app.services.cache import CacheManager
from app.services.workitems import WorkItemService

logger = structlog.get_logger()

# Step definitions
STEPS = [
    (1, "Create Work Item"),
    (2, "Generate AI Fixes"),
    (3, "Create Branch"),
    (4, "Push Changes"),
    (5, "Create Pull Request"),
    (6, "AI PR Review"),
]


class AutoFixPipeline:
    """Orchestrates the full AI Auto-Fix pipeline with step-by-step progress."""

    def __init__(self):
        self._settings = get_settings()
        self._client = ADOClient()
        self._work_item_svc = WorkItemService()
        self._cache = CacheManager()

    async def run(
        self,
        repo_id: str,
        request: AutoFixRequest,
    ) -> AsyncGenerator[AutoFixStepStatus, None]:
        """Run the full pipeline, yielding step status updates as they complete.

        This is an async generator — callers iterate over it to get real-time
        status updates for each step.
        """
        settings = self._settings
        org = request.organization or settings.ado_organization or "inmar"
        project = request.project or settings.ado_project or "Finance"

        # Initialize result tracking
        result = AutoFixResult(repo_id=repo_id, status="running")

        # Look up repo info from cache
        repo_info, scan_result = self._get_repo_from_cache(org, repo_id)
        if not repo_info:
            step = AutoFixStepStatus(
                step=0,
                name="Initialization",
                status="failed",
                details=f"Repository {repo_id} not found in cache. Run a scan first.",
            )
            yield step
            return

        result.repo_name = repo_info.get("name", repo_id)
        repo_name = result.repo_name

        # Get failing rules
        failing_rules = self._get_failing_rules(scan_result, request.failing_rules)
        if not failing_rules:
            step = AutoFixStepStatus(
                step=0,
                name="Initialization",
                status="failed",
                details="No failing rules found for this repository.",
            )
            yield step
            return

        logger.info(
            "autofix_starting",
            repo=repo_name,
            failing_rules=len(failing_rules),
        )

        # ── Step 1: Create Work Item ────────────────────────────────────────
        yield AutoFixStepStatus(step=1, name="Create Work Item", status="running")
        try:
            story_request = CreateStoryRequest(
                repo_id=repo_id,
                repo_name=repo_name,
                failing_rules=[r["rule_id"] for r in failing_rules],
                overall_score=scan_result.get("overall_score", 0) if scan_result else 0,
                organization=org,
            )
            story_result = await self._work_item_svc.create_migration_story(story_request)
            result.story_id = story_result.work_item_id
            result.story_url = story_result.url

            # Detect if the work item was reused (title won't start with our
            # exact generated pattern if it was fetched from an existing item)
            yield AutoFixStepStatus(
                step=1,
                name="Create Work Item",
                status="completed",
                details=f"Story #{story_result.work_item_id} linked",
                url=story_result.url,
                data={"work_item_id": story_result.work_item_id},
            )
        except Exception as e:
            logger.error("autofix_step1_failed", error=str(e))
            yield AutoFixStepStatus(
                step=1, name="Create Work Item", status="failed",
                details=f"Failed to create work item: {str(e)[:200]}",
            )
            # Continue — story creation failure is non-fatal for the code fix flow

        # ── Step 2: Generate AI Fixes ───────────────────────────────────────
        yield AutoFixStepStatus(step=2, name="Generate AI Fixes", status="running")
        try:
            # Fetch wiki rules to give AI full context of standards
            wiki_rules = await ai_compliance.fetch_wiki_rules(self._client, project)

            # Fetch current file contents for files that need fixing
            file_contents = await self._fetch_files_for_rules(
                project, repo_id, failing_rules
            )

            fixes = await ai_service.generate_code_fixes(
                repo_name=repo_name,
                failing_rules=failing_rules,
                file_contents=file_contents,
                wiki_rules=wiki_rules,
            )

            if not fixes:
                yield AutoFixStepStatus(
                    step=2, name="Generate AI Fixes", status="failed",
                    details="AI could not generate any code fixes.",
                )
                # Skip remaining steps
                for s, name in STEPS[2:]:
                    yield AutoFixStepStatus(step=s, name=name, status="skipped")
                return

            result.files_changed = list(fixes.keys())
            yield AutoFixStepStatus(
                step=2,
                name="Generate AI Fixes",
                status="completed",
                details=f"Fixed {len(fixes)} file(s): {', '.join(f.rsplit('/', 1)[-1] for f in fixes)}",
                data={"files": list(fixes.keys())},
            )
        except Exception as e:
            logger.error("autofix_step2_failed", error=str(e))
            yield AutoFixStepStatus(
                step=2, name="Generate AI Fixes", status="failed",
                details=f"AI fix generation failed: {str(e)[:200]}",
            )
            for s, name in STEPS[2:]:
                yield AutoFixStepStatus(step=s, name=name, status="skipped")
            return

        # ── Step 3: Create Branch ───────────────────────────────────────────
        yield AutoFixStepStatus(step=3, name="Create Branch", status="running")
        try:
            ref_name, source_commit = await self._client.get_default_branch_ref(
                project, repo_id
            )
            target_branch_name = ref_name.replace("refs/heads/", "")

            date_str = datetime.now().strftime("%Y%m%d-%H%M")
            branch_name = f"feature/migrationlens-autofix-{date_str}"
            result.branch_name = branch_name

            await self._client.create_branch(
                project, repo_id, branch_name, source_commit
            )

            yield AutoFixStepStatus(
                step=3,
                name="Create Branch",
                status="completed",
                details=f"Branch: {branch_name}",
                data={"branch": branch_name, "from_commit": source_commit[:8]},
            )
        except Exception as e:
            logger.error("autofix_step3_failed", error=str(e))
            yield AutoFixStepStatus(
                step=3, name="Create Branch", status="failed",
                details=f"Branch creation failed: {str(e)[:200]}",
            )
            for s, name in STEPS[3:]:
                yield AutoFixStepStatus(step=s, name=name, status="skipped")
            return

        # ── Step 4: Push Changes ────────────────────────────────────────────
        yield AutoFixStepStatus(step=4, name="Push Changes", status="running")
        try:
            commit_msg = (
                f"[MigrationLens] Auto-fix: {len(fixes)} compliance issues\n\n"
                f"Repository: {repo_name}\n"
                f"Rules fixed: {', '.join(r['rule_id'] for r in failing_rules[:10])}\n"
                f"Generated by MigrationLens AI Auto-Fix Pipeline"
            )

            await self._client.push_changes(
                project=project,
                repo_id=repo_id,
                branch_name=branch_name,
                changes=fixes,
                commit_message=commit_msg,
                source_commit=source_commit,
            )

            yield AutoFixStepStatus(
                step=4,
                name="Push Changes",
                status="completed",
                details=f"Pushed {len(fixes)} file(s) to {branch_name}",
            )
        except Exception as e:
            logger.error("autofix_step4_failed", error=str(e))
            yield AutoFixStepStatus(
                step=4, name="Push Changes", status="failed",
                details=f"Push failed: {str(e)[:200]}",
            )
            for s, name in STEPS[4:]:
                yield AutoFixStepStatus(step=s, name=name, status="skipped")
            return

        # ── Step 5: Create Pull Request ─────────────────────────────────────
        yield AutoFixStepStatus(step=5, name="Create Pull Request", status="running")
        try:
            rule_summary = "\n".join(
                f"- **{r['rule_id']}** ({r.get('severity', 'medium')}): {r['rule_name']}"
                for r in failing_rules[:15]
            )
            pr_description = (
                f"## MigrationLens AI Auto-Fix\n\n"
                f"**Repository**: {repo_name}\n"
                f"**Files Changed**: {len(fixes)}\n"
                f"**Compliance Rules Fixed**: {len(failing_rules)}\n\n"
                f"### Rules Addressed\n{rule_summary}\n\n"
                f"### Files Modified\n"
                + "\n".join(f"- `{f}`" for f in fixes.keys())
                + "\n\n---\n*Generated by MigrationLens AI Auto-Fix Pipeline*"
            )

            pr_result = await self._client.create_pull_request(
                project=project,
                repo_id=repo_id,
                source_branch=branch_name,
                target_branch=target_branch_name,
                title=f"[MigrationLens] Auto-fix {len(failing_rules)} compliance issues — {repo_name}",
                description=pr_description,
                work_item_id=result.story_id if result.story_id else None,
            )

            pr_id = pr_result.get("pullRequestId", 0)
            result.pr_id = pr_id

            # Build proper PR URL
            repo_info_raw = await self._client.get_repo_metadata(project, repo_id)
            r_name = (repo_info_raw or {}).get("name", repo_name)
            result.pr_url = (
                f"https://dev.azure.com/{org}/{project}/_git/{r_name}"
                f"/pullrequest/{pr_id}"
            )

            yield AutoFixStepStatus(
                step=5,
                name="Create Pull Request",
                status="completed",
                details=f"PR #{pr_id} created",
                url=result.pr_url,
                data={"pr_id": pr_id},
            )
        except Exception as e:
            logger.error("autofix_step5_failed", error=str(e))
            yield AutoFixStepStatus(
                step=5, name="Create Pull Request", status="failed",
                details=f"PR creation failed: {str(e)[:200]}",
            )
            yield AutoFixStepStatus(step=6, name="AI PR Review", status="skipped")
            return

        # ── Step 6: AI PR Review ────────────────────────────────────────────
        yield AutoFixStepStatus(step=6, name="AI PR Review", status="running")
        try:
            # Fetch PR diff
            diff = await self._client.get_pr_diff(project, repo_id, pr_id)

            # Build acceptance criteria from the failing rules
            ac_lines = "\n".join(
                f"- {r['rule_name']} must pass after changes"
                for r in failing_rules[:20]
            )

            # Run AI review
            review_raw = await ai_service.review_pull_request(
                story_description=f"Migrate {repo_name} to .NET 10 / C# 14 — fix {len(failing_rules)} compliance issues",
                acceptance_criteria=ac_lines or "All compliance rules should pass after these changes",
                business_logic="Automated compliance fixes for .NET 10 migration",
                pr_diff=diff,
                pr_title=f"[MigrationLens] Auto-fix compliance issues — {repo_name}",
            )

            # Post review as PR comment
            verdict = review_raw.get("verdict", "NEEDS_CHANGES")
            confidence = review_raw.get("confidence_score", 0)
            summary = review_raw.get("summary", "")

            comment_text = (
                f"## 🤖 MigrationLens AI Review\n\n"
                f"**Verdict**: {verdict}\n"
                f"**Confidence**: {confidence}%\n\n"
                f"{summary}\n\n"
                f"---\n*Auto-reviewed by MigrationLens AI PR Reviewer*"
            )
            await self._client.post_pr_comment(project, repo_id, pr_id, comment_text)

            result.review_verdict = verdict
            result.review_score = confidence

            yield AutoFixStepStatus(
                step=6,
                name="AI PR Review",
                status="completed",
                details=f"Verdict: {verdict} ({confidence}% confidence)",
                data={"verdict": verdict, "confidence": confidence},
            )
        except Exception as e:
            logger.error("autofix_step6_failed", error=str(e))
            yield AutoFixStepStatus(
                step=6, name="AI PR Review", status="failed",
                details=f"PR review failed: {str(e)[:200]}",
            )

        result.status = "completed"
        result.completed_at = datetime.now(timezone.utc).isoformat()
        logger.info(
            "autofix_completed",
            repo=repo_name,
            story=result.story_id,
            pr=result.pr_id,
            files=len(result.files_changed),
        )

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _get_repo_from_cache(
        self, org: str, repo_id: str
    ) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
        """Look up a repository and its scan result from cache."""
        data = self._cache.load(org)
        if not data:
            return None, None

        repos = data.repositories or data.scan_results or []
        for repo_result in repos:
            repo = repo_result.repository
            if repo.id == repo_id:
                # Convert to dicts for easy access
                repo_dict = repo.model_dump() if hasattr(repo, "model_dump") else repo.__dict__
                result_dict = repo_result.model_dump() if hasattr(repo_result, "model_dump") else repo_result.__dict__
                return repo_dict, result_dict

        return None, None

    def _get_failing_rules(
        self,
        scan_result: dict[str, Any] | None,
        requested_rule_ids: list[str],
    ) -> list[dict[str, Any]]:
        """Extract failing rules from scan results."""
        if not scan_result:
            return []

        compliance_results = scan_result.get("compliance_results", [])
        failing = []

        for cr in compliance_results:
            status = cr.get("status", "")
            # Handle both string and enum status
            if isinstance(status, str):
                is_fail = status.lower() == "fail"
            else:
                is_fail = str(status).lower() == "fail" or getattr(status, "value", "") == "fail"

            if not is_fail:
                continue

            rule_id = cr.get("rule_id", "")

            # If specific rules requested, filter to only those
            if requested_rule_ids and rule_id not in requested_rule_ids:
                continue

            failing.append({
                "rule_id": rule_id,
                "rule_name": cr.get("rule_name", rule_id),
                "category": cr.get("category", ""),
                "severity": cr.get("severity", "medium"),
                "details": cr.get("details", ""),
                "file_path": cr.get("file_path", ""),
                "suggested_fix": cr.get("suggested_fix", ""),
            })

        return failing

    async def _fetch_files_for_rules(
        self,
        project: str,
        repo_id: str,
        failing_rules: list[dict[str, Any]],
    ) -> dict[str, str]:
        """Fetch current file contents from ADO for files affected by failing rules."""
        # Collect unique file paths that need to be fetched
        file_paths: set[str] = set()
        for rule in failing_rules:
            fp = rule.get("file_path", "")
            if fp:
                file_paths.add(fp)

        # Also add common files that rules might need to modify
        common_files = [
            "*.csproj",  # SDK, Lang, Config rules
            "Dockerfile",
            "Program.cs",
            "global.json",
            ".editorconfig",
        ]

        # List repo items to find actual file paths
        items = await self._client.list_items(project, repo_id)
        all_paths = [item.get("path", "") for item in items if not item.get("isFolder")]

        # Add common files if they exist
        for common in common_files:
            if common.startswith("*"):
                ext = common[1:]
                for p in all_paths:
                    if p.endswith(ext) and p not in file_paths:
                        file_paths.add(p)
            else:
                for p in all_paths:
                    if p.endswith(f"/{common}") or p == f"/{common}":
                        file_paths.add(p)

        # Fetch file contents
        contents: dict[str, str] = {}
        for fp in file_paths:
            content = await self._client.get_file_content(project, repo_id, fp)
            if content:
                contents[fp] = content

        logger.info("files_fetched_for_autofix", count=len(contents), paths=list(contents.keys())[:10])
        return contents
