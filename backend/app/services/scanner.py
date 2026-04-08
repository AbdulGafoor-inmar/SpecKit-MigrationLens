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
from app.services import ai_compliance

logger = structlog.get_logger()


class ScannerService:
    """Orchestrates repository scanning and compliance evaluation."""

    def __init__(self):
        self._progress = ScanProgress()
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
        repo_branches: dict[str, str] | None = None,
    ) -> DashboardSummary:
        """
        Scan repositories and evaluate compliance using AI against wiki rules.

        Args:
            organization: ADO organization name
            project: Optional project filter
            pat_token: Optional PAT override
            repo_ids: Optional list of specific repo IDs to scan (scans all if empty)
            repo_branches: Optional mapping of repo ID to branch name

        Returns:
            DashboardSummary with all scan results
        """
        # Mark scan as active immediately so polling picks it up
        self._progress = ScanProgress(
            total_repos=0,
            scanned_repos=0,
            is_scanning=True,
            message="Initializing scan...",
            started_at=datetime.now(timezone.utc).isoformat(),
        )
        self._cancelled = False

        client = ADOClient(pat=pat_token or None, organization=organization)

        # Fetch repository list
        logger.info("scan_started", organization=organization, project=project)
        self._progress.message = "Fetching repository list..."
        repos_raw = await client.list_repositories(project)

        if not repos_raw:
            logger.warning("no_repos_found", organization=organization)
            self._progress.is_scanning = False
            self._progress.message = "No repositories found."
            return DashboardSummary(last_scan_time=datetime.now(timezone.utc).isoformat())

        # Filter by repo_ids if provided
        if repo_ids:
            repos_raw = [r for r in repos_raw if r.get("id", "") in repo_ids]
            logger.info("filtered_repos", total=len(repos_raw), requested=len(repo_ids))

        if not repos_raw:
            logger.warning("no_repos_found", organization=organization)
            self._progress.is_scanning = False
            self._progress.message = "No repositories found."
            return DashboardSummary(last_scan_time=datetime.now(timezone.utc).isoformat())

        # Fetch wiki rules once for the entire scan
        self._progress.message = "Fetching compliance rules from wiki..."
        ai_compliance.clear_wiki_cache()
        wiki_rules_content = await ai_compliance.fetch_wiki_rules(client, project)
        if not wiki_rules_content:
            logger.error("wiki_rules_not_available_scan_cannot_proceed")
            self._progress.is_scanning = False
            self._progress.message = "Failed to fetch wiki rules."
            return DashboardSummary(last_scan_time=datetime.now(timezone.utc).isoformat())

        # Update progress with actual repo count
        self._progress.total_repos = len(repos_raw)
        self._progress.message = "Starting scan..."
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

            # Use user-specified branch if provided, otherwise use default
            branch = (repo_branches or {}).get(repo_id, default_branch)

            self._progress.current_repo = repo_name
            self._progress.message = f"Scanning {repo_name} ({branch})..."
            logger.info("scanning_repo", repo=repo_name, branch=branch)

            try:
                result = await self._scan_single_repo(
                    client, repo_id, repo_name, repo_project, branch, repo_raw,
                    wiki_rules_content=wiki_rules_content,
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
        wiki_rules_content: str = "",
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

        # Fetch sample .cs files (up to 15 for AI pattern detection) as (path, content) tuples
        cs_paths = [f for f in file_list if f.endswith(".cs")][:15]
        cs_files: list[tuple[str, str]] = []
        for path in cs_paths:
            content = await client.get_file_content(project, repo_id, path, default_branch)
            if content:
                cs_files.append((path, content))

        # Fetch extra files for specific checks (Dockerfile, deployment configs, pipelines, scripts)
        extra_files: dict[str, str] = {}
        extra_patterns = [
            "Dockerfile", "deployment.yaml", "api-deployment.yaml", "cronjob.yaml",
            "azure-pipelines.yml", ".azure-pipelines.yml",
            "CreateResources.ps1", "global.json",
            "appsettings.json", "Program.cs", "Startup.cs",
            "AppConfiguration.cs",
            "api-service.yaml", "api-ingress.yaml",
            "cronjob.yaml",
            "LoggerExtension.cs", "LoggingMiddleware.cs", "ExceptionMiddleware.cs",
        ]
        for fname in extra_patterns:
            matching = [f for f in file_list if f.lower().endswith(fname.lower())]
            if matching:
                content = await client.get_file_content(
                    project, repo_id, matching[0], default_branch
                )
                if content:
                    extra_files[fname] = content

        # Fetch all .ps1 scripts (email addresses, config scripts, etc.)
        ps1_paths = [f for f in file_list if f.lower().endswith(".ps1")]
        for path in ps1_paths[:10]:
            if not any(path.lower().endswith(p.lower()) for p in extra_patterns):
                content = await client.get_file_content(project, repo_id, path, default_branch)
                if content:
                    extra_files[path] = content

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

        # Evaluate compliance using AI against wiki rules
        logger.info("using_ai_compliance_scan", repo=repo_name)
        compliance_results, category_scores = await ai_compliance.evaluate_repo_with_ai(
            repo_name=repo_name,
            csproj_files=csproj_files,
            cs_files=cs_files,
            file_list=file_list,
            extra_files=extra_files,
            app_type=app_type,
            wiki_rules_content=wiki_rules_content,
        )
        overall_score = ai_compliance.compute_overall_score(category_scores)

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

        # Compute category averages across all repos (include all categories)
        cat_totals: dict[str, list[float]] = {}
        for r in results:
            for cs in r.category_scores:
                cat_totals.setdefault(cs.category, []).append(cs.score)
        category_averages = {
            cat: round(sum(vals) / len(vals), 1) for cat, vals in cat_totals.items()
        }

        # Compute version distribution
        version_dist: dict[str, int] = {}
        for r in results:
            ver = r.dotnet_version or r.repository.dotnet_version or "unknown"
            version_dist[ver] = version_dist.get(ver, 0) + 1

        return DashboardSummary(
            total_repositories=len(results),
            scanned_repositories=len(results),
            average_score=avg_score,
            passing_repositories=passing,
            failing_repositories=failing,
            repositories=results,
            scan_timestamp=now,
            category_averages=category_averages,
            version_distribution=version_dist,
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
