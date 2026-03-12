"""Pydantic v2 schemas for all data models."""

from __future__ import annotations

from datetime import datetime, timezone

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


# ── Compliance ──────────────────────────────────────────────────────────────


class ComplianceResult(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    status: ComplianceStatus
    severity: Severity
    details: str = ""
    file_path: str | None = None


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
    scan_timestamp: str = ""
    project_count: int = 0
    complexity: Complexity = Complexity.SIMPLE


# ── Dashboard ───────────────────────────────────────────────────────────────


class DashboardSummary(BaseModel):
    total_repos: int = 0
    average_score: float = 0.0
    fully_compliant: int = 0
    needs_migration: int = 0
    version_distribution: dict[str, int] = Field(default_factory=dict)
    scan_results: list[RepoScanResult] = Field(default_factory=list)
    last_scan_time: str = ""


# ── Scan ────────────────────────────────────────────────────────────────────


class ScanRequest(BaseModel):
    organization: str
    project: str = ""
    pat_token: str = ""


class ScanProgress(BaseModel):
    total: int = 0
    completed: int = 0
    current_repo: str = ""
    percentage: float = 0.0
    is_scanning: bool = False
    started_at: str = ""


# ── Work Items ──────────────────────────────────────────────────────────────


class CreateStoryRequest(BaseModel):
    repo_name: str
    compliance_score: float
    failing_rules: list[ComplianceResult] = Field(default_factory=list)
    priority: int = Field(default=2, ge=1, le=4)


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
