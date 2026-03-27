"""Migration report endpoint — detailed per-repo migration steps with wiki gap analysis."""

from fastapi import APIRouter, HTTPException, Path, Query

from app.config import get_settings
from app.models.enums import ComplianceStatus, Severity
from app.models.schemas import (
    MigrationReport,
    MigrationStep,
    WikiStandard,
)
from app.services.ado_client import ADOClient
from app.services.cache import CacheManager
from app.services.compliance import ComplianceEngine
from app.services.wiki_analyzer import WikiAnalyzer

router = APIRouter()

# Load YAML rules once to map rule_id -> wiki_source
_WIKI_SOURCE_MAP: dict[str, str] = {}

def _get_wiki_source_map() -> dict[str, str]:
    """Build a lookup from rule_id to its wiki_source (if any)."""
    global _WIKI_SOURCE_MAP
    if _WIKI_SOURCE_MAP:
        return _WIKI_SOURCE_MAP
    engine = ComplianceEngine()
    for cat in engine._rules:
        for rule in cat.get("rules", []):
            ws = rule.get("wiki_source", "")
            if ws:
                _WIKI_SOURCE_MAP[rule["id"]] = ws
    return _WIKI_SOURCE_MAP


def _build_migration_steps(scan_result) -> list[MigrationStep]:
    """Build ordered migration steps from compliance results."""
    steps: list[MigrationStep] = []
    step_num = 0
    wiki_map = _get_wiki_source_map()

    # Severity ordering: critical first, then high, medium, low
    severity_order = {
        Severity.CRITICAL: 0,
        Severity.HIGH: 1,
        Severity.MEDIUM: 2,
        Severity.LOW: 3,
    }

    # Get failing and NA results
    failing = [
        r for r in scan_result.compliance_results
        if r.status == ComplianceStatus.FAIL
    ]
    passing = [
        r for r in scan_result.compliance_results
        if r.status == ComplianceStatus.PASS
    ]

    # Sort by severity then rule_id
    failing.sort(key=lambda r: (severity_order.get(r.severity, 99), r.rule_id))

    for result in failing:
        step_num += 1
        steps.append(
            MigrationStep(
                step_number=step_num,
                rule_id=result.rule_id,
                rule_name=result.rule_name,
                category=result.category,
                severity=result.severity,
                status=result.status,
                file_path=result.file_path or "",
                line_number=result.line_number,
                current_code=result.current_code,
                suggested_fix=result.suggested_fix,
                description=result.details,
                migration_guide=result.migration_guide,
                wiki_source=wiki_map.get(result.rule_id, ""),
            )
        )

    # Also include passing rules as verified steps (for visibility)
    for result in passing:
        step_num += 1
        steps.append(
            MigrationStep(
                step_number=step_num,
                rule_id=result.rule_id,
                rule_name=result.rule_name,
                category=result.category,
                severity=result.severity,
                status=result.status,
                file_path=result.file_path or "",
                line_number=result.line_number,
                current_code=result.current_code,
                suggested_fix="",
                description=result.details or f"Compliant with {result.rule_name}",
                migration_guide="",
                wiki_source=wiki_map.get(result.rule_id, ""),
            )
        )

    return steps


def _find_scan_result(cache: CacheManager, repo_id: str, organization: str = ""):
    """Search for a repo's scan results in cached data."""
    if organization:
        data = cache.load(organization)
        if data:
            # Try both new and legacy field names
            results = data.repositories or data.scan_results or []
            for result in results:
                if result.repository.id == repo_id:
                    return result

    # Search all cache files
    from pathlib import Path as FilePath
    cache_dir = FilePath(cache._cache_dir)
    if cache_dir.exists():
        for f in cache_dir.glob("dashboard_*.json"):
            if f.name.endswith(".meta.json"):
                continue
            org_name = f.stem.replace("dashboard_", "")
            data = cache.load(org_name)
            if data:
                results = data.repositories or data.scan_results or []
                for result in results:
                    if result.repository.id == repo_id:
                        return result

    return None


@router.get("/repos/{repo_id}/migration-report", response_model=MigrationReport)
async def get_migration_report(
    repo_id: str = Path(..., description="Repository ID"),
    organization: str = Query("", description="ADO organization name"),
    project: str = Query("", description="ADO project name"),
) -> MigrationReport:
    """Generate a detailed migration report for a specific repository.

    Returns step-by-step migration guidance with file paths, line numbers,
    current code snippets, suggested fixes, and wiki standards references.
    """
    settings = get_settings()
    org = organization or settings.ado_organization
    proj = project or settings.ado_project

    cache = CacheManager()
    scan_result = _find_scan_result(cache, repo_id, org)

    if not scan_result:
        raise HTTPException(
            status_code=404,
            detail="Repository not found in scan data. Please scan the repository first.",
        )

    # Build migration steps from compliance results
    steps = _build_migration_steps(scan_result)

    # Count by severity
    failing_steps = [s for s in steps if s.status == ComplianceStatus.FAIL]
    critical_steps = sum(1 for s in failing_steps if s.severity == Severity.CRITICAL)
    high_steps = sum(1 for s in failing_steps if s.severity == Severity.HIGH)
    medium_steps = sum(1 for s in failing_steps if s.severity == Severity.MEDIUM)
    low_steps = sum(1 for s in failing_steps if s.severity == Severity.LOW)

    passing_count = sum(1 for s in steps if s.status == ComplianceStatus.PASS)
    failing_count = len(failing_steps)

    # Fetch wiki standards from memory cache (never block on ADO wiki fetch)
    from app.services.cache import mem_get, mem_set
    import asyncio

    cache_key = f"wiki_standards:{org}:{proj}"
    wiki_standards: list[WikiStandard] = mem_get(cache_key) or []

    if not wiki_standards and org and proj:
        # Fire-and-forget: populate cache in background, don't block the response
        async def _bg_wiki_fetch():
            try:
                client = ADOClient(organization=org)
                analyzer = WikiAnalyzer(client)
                stds = await analyzer.analyze_project_wikis(proj)
                if stds:
                    mem_set(cache_key, stds, ttl=86400)  # 24-hour TTL
            except Exception:
                pass

        asyncio.ensure_future(_bg_wiki_fetch())

    # Match wiki standards to migration steps
    for standard in wiki_standards:
        for step in steps:
            if step.category in standard.related_rules:
                if not step.wiki_reference:
                    step.wiki_reference = f"[{standard.title}]({standard.url})"

    return MigrationReport(
        repository=scan_result.repository,
        steps=steps,
        total_steps=len(failing_steps),
        critical_steps=critical_steps,
        high_steps=high_steps,
        medium_steps=medium_steps,
        low_steps=low_steps,
        passing_rules=passing_count,
        failing_rules=failing_count,
        overall_score=scan_result.overall_score,
        dotnet_version_current=scan_result.dotnet_version or scan_result.repository.dotnet_version or "unknown",
        wiki_standards=wiki_standards,
        categories_summary=scan_result.category_scores,
    )
