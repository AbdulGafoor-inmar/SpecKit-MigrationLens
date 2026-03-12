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
    ) -> DashboardSummary:
        """
        Scan all repositories and evaluate compliance.

        Args:
            organization: ADO organization name
            project: Optional project filter
            pat_token: Optional PAT override

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

        # Initialize progress
        self._progress = ScanProgress(
            total=len(repos_raw),
            completed=0,
            is_scanning=True,
            started_at=datetime.now(timezone.utc).isoformat(),
        )

        scan_results: list[RepoScanResult] = []

        for repo_raw in repos_raw:
            repo_name = repo_raw.get("name", "unknown")
            repo_id = repo_raw.get("id", "")
            repo_project = repo_raw.get("project", {}).get("name", project)
            default_branch = (
                repo_raw.get("defaultBranch", "refs/heads/main")
                .replace("refs/heads/", "")
            )

            self._progress.current_repo = repo_name
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

            self._progress.completed += 1
            self._progress.percentage = round(
                (self._progress.completed / self._progress.total) * 100, 1
            )

        # Build summary
        summary = self._build_summary(scan_results)

        # Save to cache
        self._cache.save(organization, summary)

        # Mark scan complete
        self._progress.is_scanning = False
        self._progress.current_repo = ""
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

        # Fetch .csproj contents
        csproj_contents: list[str] = []
        for path in csproj_paths[:10]:  # Limit to 10 for performance
            content = await client.get_file_content(project, repo_id, path, default_branch)
            if content:
                csproj_contents.append(content)

        # Fetch sample .cs files (up to 5 for pattern detection)
        cs_paths = [f for f in file_list if f.endswith(".cs")][:5]
        cs_contents: list[str] = []
        for path in cs_paths:
            content = await client.get_file_content(project, repo_id, path, default_branch)
            if content:
                cs_contents.append(content)

        # Fetch extra files for specific checks
        extra_files: dict[str, str] = {}
        for fname in ["Dockerfile"]:
            matching = [f for f in file_list if f.lower().endswith(fname.lower())]
            if matching:
                content = await client.get_file_content(
                    project, repo_id, matching[0], default_branch
                )
                if content:
                    extra_files[fname] = content

        # Detect .NET version from csproj
        dotnet_version = "unknown"
        for content in csproj_contents:
            import re

            match = re.search(r"<TargetFramework>(net[\w.]+)</TargetFramework>", content)
            if match:
                dotnet_version = match.group(1)
                break

        # Evaluate compliance
        compliance_results, category_scores = self._engine.evaluate(
            csproj_contents, cs_contents, file_list, extra_files
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
            ),
            compliance_results=compliance_results,
            category_scores=category_scores,
            overall_score=overall_score,
            scan_timestamp=datetime.now(timezone.utc).isoformat(),
            project_count=project_count,
            complexity=complexity,
        )

    def _build_summary(self, results: list[RepoScanResult]) -> DashboardSummary:
        """Build dashboard summary from individual scan results."""
        if not results:
            return DashboardSummary(last_scan_time=datetime.now(timezone.utc).isoformat())

        scores = [r.overall_score for r in results]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        version_dist: dict[str, int] = {}
        for r in results:
            v = r.repository.dotnet_version
            version_dist[v] = version_dist.get(v, 0) + 1

        return DashboardSummary(
            total_repos=len(results),
            average_score=avg_score,
            fully_compliant=sum(1 for s in scores if s >= 90),
            needs_migration=sum(1 for s in scores if s < 70),
            version_distribution=version_dist,
            scan_results=results,
            last_scan_time=datetime.now(timezone.utc).isoformat(),
        )


# Singleton instance
_scanner: ScannerService | None = None


def get_scanner() -> ScannerService:
    global _scanner
    if _scanner is None:
        _scanner = ScannerService()
    return _scanner
