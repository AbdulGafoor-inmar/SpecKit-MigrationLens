"""Pydantic v2 schemas for all data models."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from .enums import ComplianceStatus, Complexity, ExportFormat, Severity


# ── Repository ──────────────────────────────────────────────────────────────


class RepositoryInfo(BaseModel):
    id: str
    name: str
    url: str = ""
    default_branch: str = "main"
    project: str = ""
    dotnet_version: str = "unknown"
    last_commit_date: str = ""
    app_type: str = "api"  # api, cronjob, worker, library


# ── Compliance ──────────────────────────────────────────────────────────────


class ComplianceResult(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    status: ComplianceStatus
    severity: Severity
    details: str = ""
    file_path: str | None = None
    line_number: int | None = None
    current_code: str = ""
    suggested_fix: str = ""
    migration_guide: str = ""


class CategoryScore(BaseModel):
    category: str
    score: float = 0.0
    total_rules: int = 0
    passed: int = 0
    failed: int = 0
    not_applicable: int = 0


class RepoScanResult(BaseModel):
    repository: RepositoryInfo
    compliance_results: list[ComplianceResult] = Field(default_factory=list)
    category_scores: list[CategoryScore] = Field(default_factory=list)
    overall_score: float = 0.0
    compliance_status: str = "na"  # pass / fail / na
    dotnet_version: str | None = None
    csharp_version: str | None = None
    categories: list[CategoryScore] = Field(default_factory=list)
    scan_timestamp: str = ""
    project_count: int = 0
    complexity: Complexity = Complexity.SIMPLE


# ── Dashboard ───────────────────────────────────────────────────────────────


class DashboardSummary(BaseModel):
    organization: str = ""
    project: str = ""
    total_repositories: int = 0
    scanned_repositories: int = 0
    average_score: float = 0.0
    passing_repositories: int = 0
    failing_repositories: int = 0
    repositories: list[RepoScanResult] = Field(default_factory=list)
    scan_timestamp: str = ""
    category_averages: dict[str, float] = Field(default_factory=dict)
    # Legacy fields kept for cache backward compatibility
    scan_results: list[RepoScanResult] = Field(default_factory=list)
    total_repos: int = 0
    fully_compliant: int = 0
    needs_migration: int = 0
    version_distribution: dict[str, int] = Field(default_factory=dict)
    last_scan_time: str = ""


# ── Scan ────────────────────────────────────────────────────────────────────


class ScanRequest(BaseModel):
    organization: str = ""
    project: str = ""
    pat_token: str = ""
    repo_ids: list[str] = Field(default_factory=list, description="Optional list of repo IDs to scan. If empty, scans all.")
    repo_branches: dict[str, str] = Field(default_factory=dict, description="Optional mapping of repo ID to branch name. Uses default branch if not specified.")


class ScanProgress(BaseModel):
    total_repos: int = 0
    scanned_repos: int = 0
    current_repo: str = ""
    progress: float = 0.0
    is_scanning: bool = False
    message: str = ""
    started_at: str = ""


# ── Wiki ────────────────────────────────────────────────────────────────────


class WikiInfo(BaseModel):
    id: str = ""
    name: str = ""
    type: str = ""  # "projectWiki" or "codeWiki"
    url: str = ""
    project_id: str = ""
    repository_id: str = ""


class WikiPage(BaseModel):
    id: int = 0
    path: str = "/"
    content: str = ""
    git_item_path: str = ""
    sub_pages: list["WikiPage"] = Field(default_factory=list)
    remote_url: str = ""
    order: int = 0


class WikiPageListResponse(BaseModel):
    wiki_id: str = ""
    wiki_name: str = ""
    pages: list[WikiPage] = Field(default_factory=list)


# ── Work Items ──────────────────────────────────────────────────────────────


class WorkItemInfo(BaseModel):
    id: int = 0
    title: str = ""
    state: str = ""
    work_item_type: str = ""
    assigned_to: str = ""
    priority: int = 0
    tags: str = ""
    created_date: str = ""
    changed_date: str = ""
    url: str = ""


class WorkItemQueryRequest(BaseModel):
    wiql: str = ""
    project: str = ""
    top: int = Field(default=200, ge=1, le=500)


class WorkItemQueryResponse(BaseModel):
    count: int = 0
    work_items: list[WorkItemInfo] = Field(default_factory=list)


class BoardInfo(BaseModel):
    id: str = ""
    name: str = ""
    url: str = ""


class BoardColumn(BaseModel):
    id: str = ""
    name: str = ""
    item_limit: int = 0
    state_mappings: dict[str, str] = Field(default_factory=dict)


class BoardDetailResponse(BaseModel):
    board_name: str = ""
    columns: list[BoardColumn] = Field(default_factory=list)
    work_items: list[WorkItemInfo] = Field(default_factory=list)


class CreateStoryRequest(BaseModel):
    repo_id: str = ""
    repo_name: str
    failing_rules: list[str] = Field(default_factory=list)
    overall_score: float = 0.0
    compliance_score: float = 0.0  # alias kept for backward compat
    priority: int = Field(default=2, ge=1, le=4)
    organization: str = ""

    @property
    def score(self) -> float:
        """Return whichever score field was populated."""
        return self.overall_score or self.compliance_score


class CreateStoryResponse(BaseModel):
    work_item_id: int
    url: str
    title: str


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ── Scan Start Response ────────────────────────────────────────────────────


class ScanStartResponse(BaseModel):
    message: str = "Scan started"
    total_repos: int = 0


# ── Migration Report ───────────────────────────────────────────────────────


class MigrationStep(BaseModel):
    """A single actionable migration change with file-level details."""
    step_number: int = 0
    rule_id: str = ""
    rule_name: str = ""
    category: str = ""
    severity: Severity = Severity.MEDIUM
    status: ComplianceStatus = ComplianceStatus.FAIL
    file_path: str = ""
    line_number: int | None = None
    current_code: str = ""
    suggested_fix: str = ""
    description: str = ""
    migration_guide: str = ""
    wiki_reference: str = ""
    wiki_source: str = ""  # wiki page this rule was derived from


class WikiStandard(BaseModel):
    """A standard extracted from a wiki page."""
    title: str = ""
    source_page: str = ""
    wiki_name: str = ""
    content_summary: str = ""
    related_rules: list[str] = Field(default_factory=list)
    url: str = ""


class MigrationReport(BaseModel):
    """Detailed per-repository migration report with step-by-step guidance."""
    repository: RepositoryInfo
    steps: list[MigrationStep] = Field(default_factory=list)
    total_steps: int = 0
    critical_steps: int = 0
    high_steps: int = 0
    medium_steps: int = 0
    low_steps: int = 0
    passing_rules: int = 0
    failing_rules: int = 0
    overall_score: float = 0.0
    dotnet_version_current: str = "unknown"
    dotnet_version_target: str = "net10.0"
    csharp_version_target: str = "14"
    wiki_standards: list[WikiStandard] = Field(default_factory=list)
    categories_summary: list[CategoryScore] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ── AI-powered analysis models ─────────────────────────────────────────────


class AIInsight(BaseModel):
    """A single AI-discovered insight beyond rule-based checks."""
    title: str = ""
    description: str = ""
    severity: str = "medium"
    category: str = ""


class AIRecommendation(BaseModel):
    """A prioritized AI recommendation."""
    priority: int = 0
    action: str = ""
    effort: str = "medium"   # low | medium | high
    impact: str = "medium"   # low | medium | high


class AICodeAnalysis(BaseModel):
    """AI-powered deep code analysis result."""
    summary: str = ""
    insights: list[AIInsight] = Field(default_factory=list)
    recommendations: list[AIRecommendation] = Field(default_factory=list)


class AIRiskFactor(BaseModel):
    """A single risk factor identified by AI."""
    factor: str = ""
    impact: str = "medium"
    description: str = ""


class AIRiskAssessment(BaseModel):
    """AI-powered risk assessment for a migration."""
    risk_level: str = "medium"       # low | medium | high | critical
    risk_score: float = 50.0         # 0-100
    effort_estimate_days: float = 5.0
    risk_factors: list[AIRiskFactor] = Field(default_factory=list)
    mitigation_suggestions: list[str] = Field(default_factory=list)
    confidence: float = 70.0         # 0-100


class AIMigrationTask(BaseModel):
    """A single task within a migration phase."""
    task: str = ""
    effort_hours: float = 0
    rule_ids: list[str] = Field(default_factory=list)


class AIMigrationPhase(BaseModel):
    """A phase in the AI-generated migration plan."""
    name: str = ""
    description: str = ""
    order: int = 0
    tasks: list[AIMigrationTask] = Field(default_factory=list)
    estimated_hours: float = 0


class AIPRSuggestion(BaseModel):
    """An AI-suggested PR for the migration."""
    title: str = ""
    description: str = ""
    files_to_change: list[str] = Field(default_factory=list)
    phase: int = 0


class AIBreakingChange(BaseModel):
    """A potential breaking change flagged by AI."""
    description: str = ""
    mitigation: str = ""


class AIMigrationPlan(BaseModel):
    """AI-generated phased migration plan."""
    phases: list[AIMigrationPhase] = Field(default_factory=list)
    estimated_total_hours: float = 0
    pr_suggestions: list[AIPRSuggestion] = Field(default_factory=list)
    breaking_changes: list[AIBreakingChange] = Field(default_factory=list)


class AIAnalysisResponse(BaseModel):
    """Combined AI analysis response for the frontend."""
    code_analysis: AICodeAnalysis = Field(default_factory=AICodeAnalysis)
    risk_assessment: AIRiskAssessment = Field(default_factory=AIRiskAssessment)
    migration_plan: AIMigrationPlan = Field(default_factory=AIMigrationPlan)
    ai_available: bool = True
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ── PR Review Models ───────────────────────────────────────────────────────


class PullRequestInfo(BaseModel):
    """Summary of an ADO Pull Request."""
    pr_id: int = 0
    title: str = ""
    description: str = ""
    status: str = ""
    source_branch: str = ""
    target_branch: str = ""
    created_by: str = ""
    creation_date: str = ""
    url: str = ""
    repo_id: str = ""
    repo_name: str = ""


class PRLinkedWorkItem(BaseModel):
    """A work item linked to a PR."""
    id: int = 0
    title: str = ""
    description: str = ""
    acceptance_criteria: str = ""
    work_item_type: str = ""
    state: str = ""
    url: str = ""


class PRAcceptanceCriterionResult(BaseModel):
    """Review result for a single acceptance criterion."""
    criterion: str = ""
    status: str = "missing"     # implemented | missing | partial
    details: str = ""


class PRCodeQualityIssue(BaseModel):
    """A code quality issue found during review."""
    issue: str = ""
    severity: str = "medium"
    file: str = ""
    line: int | None = None
    method: str = ""
    details: str = ""
    suggested_fix: str = ""


class PRBusinessLogicIssue(BaseModel):
    """A business logic issue found during review."""
    issue: str = ""
    severity: str = "medium"
    file: str = ""
    line: int | None = None
    method: str = ""
    details: str = ""
    suggested_fix: str = ""


class PRStandardsViolation(BaseModel):
    """A coding standards violation."""
    violation: str = ""
    standard: str = ""
    severity: str = "medium"
    file: str = ""
    line: int | None = None
    method: str = ""
    details: str = ""
    suggested_fix: str = ""


class PRRisk(BaseModel):
    """A risk identified during review."""
    risk: str = ""
    type: str = "edge_case"     # breaking | performance | security | edge_case
    severity: str = "medium"
    file: str = ""
    line: int | None = None
    method: str = ""
    details: str = ""
    suggested_fix: str = ""


class PRCompleteness(BaseModel):
    """Completeness check result."""
    has_tests: bool = False
    has_docs: bool = False
    has_config_changes: bool = False
    has_migrations: bool = False
    notes: str = ""


class PRSuggestion(BaseModel):
    """An improvement suggestion."""
    suggestion: str = ""
    priority: str = "medium"
    category: str = ""
    file: str = ""
    line: int | None = None
    method: str = ""
    code_suggestion: str = ""


class PRConfidenceBreakdown(BaseModel):
    """Confidence score breakdown for a single review dimension."""
    category: str = ""
    weight: int = 0           # max possible points for this dimension
    score: int = 0            # points awarded (0..weight)
    deductions: list[str] = Field(default_factory=list)  # specific reasons points were lost


class PRReviewResult(BaseModel):
    """Full AI PR review result."""
    pr: PullRequestInfo = Field(default_factory=PullRequestInfo)
    linked_work_items: list[PRLinkedWorkItem] = Field(default_factory=list)
    story_match: str = "unknown"       # fully_matches | partially_matches | does_not_match
    story_match_details: str = ""
    acceptance_criteria: list[PRAcceptanceCriterionResult] = Field(default_factory=list)
    business_logic_issues: list[PRBusinessLogicIssue] = Field(default_factory=list)
    code_quality_issues: list[PRCodeQualityIssue] = Field(default_factory=list)
    standards_violations: list[PRStandardsViolation] = Field(default_factory=list)
    risks: list[PRRisk] = Field(default_factory=list)
    completeness: PRCompleteness = Field(default_factory=PRCompleteness)
    suggestions: list[PRSuggestion] = Field(default_factory=list)
    verdict: str = "NEEDS_CHANGES"      # APPROVE | NEEDS_CHANGES | BLOCK
    confidence_score: int = 0
    confidence_breakdown: list[PRConfidenceBreakdown] = Field(default_factory=list)
    summary: str = ""
    files_changed: list[str] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ── Auto-Fix Pipeline ──────────────────────────────────────────────────────


class AutoFixRequest(BaseModel):
    """Request to trigger the AI Auto-Fix pipeline."""
    failing_rules: list[str] = Field(default_factory=list, description="List of failing rule IDs (e.g. ['SDK-001', 'CODE-006']). If empty, all failing rules are used.")
    organization: str = ""
    project: str = ""


class AutoFixStepStatus(BaseModel):
    """Status of a single step in the auto-fix pipeline."""
    step: int
    name: str
    status: str = "pending"  # pending | running | completed | failed | skipped
    details: str = ""
    url: str = ""
    data: dict[str, Any] = Field(default_factory=dict)


class AutoFixResult(BaseModel):
    """Final result of the auto-fix pipeline."""
    repo_id: str = ""
    repo_name: str = ""
    story_id: int = 0
    story_url: str = ""
    branch_name: str = ""
    pr_id: int = 0
    pr_url: str = ""
    files_changed: list[str] = Field(default_factory=list)
    review_verdict: str = ""
    review_score: int = 0
    steps: list[AutoFixStepStatus] = Field(default_factory=list)
    status: str = "pending"  # pending | running | completed | failed
    error: str = ""
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str = ""
