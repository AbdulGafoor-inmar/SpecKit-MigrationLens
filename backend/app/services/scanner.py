"""Repository scanning orchestrator — fetches repos from ADO and evaluates compliance."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import structlog

from app.models.enums import Complexity
from app.models.schemas import (
    DashboardSummary,
    RepoScanResult,
    RepositoryInfo,
    ScanProgress,
)
from app.services.ado_client import ADOClient
from app.services.cache import CacheManager
from app.services.compliance import ComplianceEngine

logger = structlog.get_logger()


class ScannerService:
    """Orchestrates repository scanning and compliance evaluation."""

    def __init__(self):
        self._progress = ScanProgress()
        self._engine = ComplianceEngine()
        self._cache = CacheManager()
        self._cancelled = False

    def cancel(self) -> None:
        """Request cancellation of the current scan."""
        if self._progress.is_scanning:
            self._cancelled = True
            logger.info("scan_cancel_requested")

    def force_reset(self) -> None:
        """Force-reset scan state (for stuck scans)."""
        self._progress.is_scanning = False
        self._progress.current_repo = ""
        self._progress.message = "Scan state was reset."
        self._cancelled = False
        logger.info("scan_state_force_reset")

    @property
    def progress(self) -> ScanProgress:
        return self._progress

    @property
    def is_scanning(self) -> bool:
        return self._progress.is_scanning

    async def scan_all(
        self,
        organization: str,
        project: str = "",
        pat_token: str = "",
        repo_ids: list[str] | None = None,
    ) -> DashboardSummary:
        """
        Scan repositories and evaluate compliance.

        Args:
            organization: ADO organization name
            project: Optional project filter
            pat_token: Optional PAT override
            repo_ids: Optional list of specific repo IDs to scan (scans all if empty)

        Returns:
            DashboardSummary with all scan results
        """
        client = ADOClient(pat=pat_token or None, organization=organization)

        # Fetch repository list
        logger.info("scan_started", organization=organization, project=project)
        repos_raw = await client.list_repositories(project)

        if not repos_raw:
            logger.warning("no_repos_found", organization=organization)
            return DashboardSummary(last_scan_time=datetime.now(timezone.utc).isoformat())

        # Filter by repo_ids if provided
        if repo_ids:
            repos_raw = [r for r in repos_raw if r.get("id", "") in repo_ids]
            logger.info("filtered_repos", total=len(repos_raw), requested=len(repo_ids))

        if not repos_raw:
            logger.warning("no_repos_found", organization=organization)
            return DashboardSummary(last_scan_time=datetime.now(timezone.utc).isoformat())

        # Initialize progress
        self._progress = ScanProgress(
            total_repos=len(repos_raw),
            scanned_repos=0,
            is_scanning=True,
            message="Starting scan...",
            started_at=datetime.now(timezone.utc).isoformat(),
        )

        self._cancelled = False
        scan_results: list[RepoScanResult] = []

        for repo_raw in repos_raw:
            # Check for cancellation
            if self._cancelled:
                logger.info("scan_cancelled", completed=len(scan_results))
                break

            repo_name = repo_raw.get("name", "unknown")
            repo_id = repo_raw.get("id", "")
            repo_project = repo_raw.get("project", {}).get("name", project)
            default_branch = (
                repo_raw.get("defaultBranch", "refs/heads/main")
                .replace("refs/heads/", "")
            )

            self._progress.current_repo = repo_name
            self._progress.message = f"Scanning {repo_name}..."
            logger.info("scanning_repo", repo=repo_name)

            try:
                result = await self._scan_single_repo(
                    client, repo_id, repo_name, repo_project, default_branch, repo_raw
                )
                scan_results.append(result)
            except Exception as e:
                logger.error("scan_repo_error", repo=repo_name, error=str(e))
                # Create a failed result
                scan_results.append(
                    RepoScanResult(
                        repository=RepositoryInfo(
                            id=repo_id,
                            name=repo_name,
                            project=repo_project,
                        ),
                        scan_timestamp=datetime.now(timezone.utc).isoformat(),
                    )
                )

            self._progress.scanned_repos += 1
            self._progress.progress = round(
                (self._progress.scanned_repos / self._progress.total_repos) * 100, 1
            )
            self._progress.message = f"Scanned {self._progress.scanned_repos} of {self._progress.total_repos} repositories"

        # Build summary
        summary = self._build_summary(scan_results)

        # Save to cache
        self._cache.save(organization, summary)

        # Mark scan complete
        self._progress.is_scanning = False
        self._progress.current_repo = ""
        was_cancelled = self._cancelled
        self._cancelled = False
        if was_cancelled:
            self._progress.message = f"Scan stopped. Scanned {len(scan_results)} repositories."
            logger.info("scan_stopped", scanned=len(scan_results))
        else:
            self._progress.message = f"Scan complete. Scanned {len(scan_results)} repositories."
            logger.info("scan_completed", total=len(scan_results))

        return summary

    async def _scan_single_repo(
        self,
        client: ADOClient,
        repo_id: str,
        repo_name: str,
        project: str,
        default_branch: str,
        repo_raw: dict,
    ) -> RepoScanResult:
        """Scan a single repository for compliance."""
        # Get file listing
        items = await client.list_items(project, repo_id, "/", default_branch)
        file_list = [item.get("path", "") for item in items if not item.get("isFolder", False)]

        # Find .csproj files
        csproj_paths = [f for f in file_list if f.endswith(".csproj")]

        # Fetch .csproj contents as (path, content) tuples
        csproj_files: list[tuple[str, str]] = []
        for path in csproj_paths[:10]:  # Limit to 10 for performance
            content = await client.get_file_content(project, repo_id, path, default_branch)
            if content:
                csproj_files.append((path, content))

        # Fetch sample .cs files (up to 5 for pattern detection) as (path, content) tuples
        cs_paths = [f for f in file_list if f.endswith(".cs")][:5]
        cs_files: list[tuple[str, str]] = []
        for path in cs_paths:
            content = await client.get_file_content(project, repo_id, path, default_branch)
            if content:
                cs_files.append((path, content))

        # Fetch extra files for specific checks
        extra_files: dict[str, str] = {}
        for fname in ["Dockerfile", "deployment.yaml", "api-deployment.yaml", "cronjob.yaml"]:
            matching = [f for f in file_list if f.lower().endswith(fname.lower())]
            if matching:
                content = await client.get_file_content(
                    project, repo_id, matching[0], default_branch
                )
                if content:
                    extra_files[fname] = content

        # Detect .NET version from csproj
        dotnet_version = "unknown"
        for _path, content in csproj_files:
            import re

            match = re.search(r"<TargetFramework>(net[\w.]+)</TargetFramework>", content)
            if match:
                dotnet_version = match.group(1)
                break

        # Detect application type from repo contents
        app_type = self._detect_app_type(file_list, extra_files, csproj_files, cs_files)
        logger.info("app_type_detected", repo=repo_name, app_type=app_type)

        # Evaluate compliance — filtered by app type
        compliance_results, category_scores = self._engine.evaluate(
            csproj_files, cs_files, file_list, extra_files, app_type=app_type
        )
        overall_score = ComplianceEngine.compute_overall_score(category_scores)

        # Determine complexity
        project_count = len(csproj_paths)
        if project_count <= 1:
            complexity = Complexity.SIMPLE
        elif project_count <= 5:
            complexity = Complexity.MODERATE
        else:
            complexity = Complexity.COMPLEX

        repo_url = repo_raw.get("webUrl", repo_raw.get("remoteUrl", ""))

        return RepoScanResult(
            repository=RepositoryInfo(
                id=repo_id,
                name=repo_name,
                url=repo_url,
                default_branch=default_branch,
                project=project,
                dotnet_version=dotnet_version,
                last_commit_date="",
                app_type=app_type,
            ),
            compliance_results=compliance_results,
            category_scores=category_scores,
            categories=category_scores,
            overall_score=overall_score,
            compliance_status="pass" if overall_score >= 70 else "fail",
            dotnet_version=dotnet_version,
            scan_timestamp=datetime.now(timezone.utc).isoformat(),
            project_count=project_count,
            complexity=complexity,
        )

    @staticmethod
    def _detect_app_type(
        file_list: list[str],
        extra_files: dict[str, str],
        csproj_files: list[tuple[str, str]],
        cs_files: list[tuple[str, str]],
    ) -> str:
        """
        Detect application type from repo file patterns.

        Detection priority:
          1. cronjob.yaml present  OR  name contains 'cronjob'/'cron-job'  → cronjob
          2. api-deployment.yaml / ingress / MapGet / AddControllers       → api
          3. IHostedService / BackgroundService / WorkerService             → worker
          4. No web/service indicators                                     → library
        """
        import re

        file_list_lower = [f.lower() for f in file_list]

        # Check for CronJob signals
        has_cronjob_yaml = any("cronjob.yaml" in f for f in file_list_lower)
        cronjob_content = extra_files.get("cronjob.yaml", "")
        has_cronjob_kind = bool(
            cronjob_content and re.search(r"kind:\s*CronJob", cronjob_content, re.IGNORECASE)
        )
        has_deploy_cronjob_script = any("deploy-cronjob" in f for f in file_list_lower)

        if has_cronjob_yaml or has_cronjob_kind or has_deploy_cronjob_script:
            return "cronjob"

        # Check for API signals
        has_api_deployment = any(
            "api-deployment.yaml" in f or "api-service.yaml" in f or "ingress.yaml" in f
            for f in file_list_lower
        )
        has_api_code = False
        for _path, content in cs_files:
            if re.search(
                r"app\.Map(Get|Post|Put|Delete)|AddControllers|AddSwaggerGen|UseEndpoints|MapHealthChecks|WebApplication\.Create",
                content,
            ):
                has_api_code = True
                break
        has_aspnet_ref = any(
            re.search(r"Microsoft\.AspNetCore|Sdk\.Web", content, re.IGNORECASE)
            for _, content in csproj_files
        )

        if has_api_deployment or has_api_code or has_aspnet_ref:
            return "api"

        # Check for Worker signals
        has_worker_code = False
        for _path, content in cs_files:
            if re.search(r"IHostedService|BackgroundService|Worker", content):
                has_worker_code = True
                break
        has_worker_ref = any(
            re.search(r"Microsoft\.Extensions\.Hosting|Sdk\.Worker", content, re.IGNORECASE)
            for _, content in csproj_files
        )

        if has_worker_code or has_worker_ref:
            return "worker"

        return "library"

    def _build_summary(self, results: list[RepoScanResult]) -> DashboardSummary:
        """Build dashboard summary from individual scan results."""
        now = datetime.now(timezone.utc).isoformat()
        if not results:
            return DashboardSummary(scan_timestamp=now)

        scores = [r.overall_score for r in results]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        passing = sum(1 for s in scores if s >= 70)
        failing = len(scores) - passing

        # Compute category averages across all repos
        cat_totals: dict[str, list[float]] = {}
        for r in results:
            for cs in r.category_scores:
                cat_totals.setdefault(cs.category, []).append(cs.score)
        category_averages = {
            cat: round(sum(vals) / len(vals), 1) for cat, vals in cat_totals.items()
        }

        return DashboardSummary(
            total_repositories=len(results),
            scanned_repositories=len(results),
            average_score=avg_score,
            passing_repositories=passing,
            failing_repositories=failing,
            repositories=results,
            scan_timestamp=now,
            category_averages=category_averages,
            # Also set internal fields for cache compat
            total_repos=len(results),
            scan_results=results,
            last_scan_time=now,
        )


# Singleton instance
_scanner: ScannerService | None = None


def get_scanner() -> ScannerService:
    global _scanner
    if _scanner is None:
        _scanner = ScannerService()
    return _scanner
