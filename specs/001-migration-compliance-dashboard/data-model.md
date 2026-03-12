# Data Model: MigrationLens Dashboard

**Feature**: 001-migration-compliance-dashboard
**Date**: 2026-03-12

## Entities

### RepositoryInfo

Represents a repository discovered from Azure DevOps.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique repository identifier (from ADO) |
| name | string | Repository name |
| url | string | Repository clone URL |
| default_branch | string | Default branch name (e.g., "main") |
| project | string | ADO project name |
| dotnet_version | string | Detected .NET version (e.g., "net8.0", "net10.0") |
| last_commit_date | string (ISO 8601) | Date of last commit |

### ComplianceResult

A single compliance rule evaluation result for a repository.

| Field | Type | Description |
|-------|------|-------------|
| rule_id | string | Unique rule identifier (e.g., "SDK-001") |
| rule_name | string | Human-readable rule name |
| category | string | One of 7 categories |
| status | enum | "pass", "fail", "na" |
| severity | enum | "critical", "high", "medium", "low" |
| details | string | Explanation of result or remediation guidance |
| file_path | string (optional) | File where the rule was evaluated |

### CategoryScore

Aggregated score for a compliance category.

| Field | Type | Description |
|-------|------|-------------|
| category | string | Category name (e.g., "SDK & Runtime") |
| score | float | Percentage score (0.0 - 100.0), computed from passed/(passed+failed) |
| total_rules | int | Total rules in this category |
| passed | int | Rules that passed |
| failed | int | Rules that failed |
| not_applicable | int | Rules not applicable to this repo |

**Computed**: `score = (passed / (passed + failed)) * 100` if `(passed + failed) > 0`, else `0.0`

### RepoScanResult

Complete scan result for a single repository.

| Field | Type | Description |
|-------|------|-------------|
| repository | RepositoryInfo | The scanned repository |
| compliance_results | ComplianceResult[] | All individual rule results |
| category_scores | CategoryScore[] | Per-category aggregated scores |
| overall_score | float | Overall compliance percentage |
| scan_timestamp | string (ISO 8601) | When the scan was performed |
| project_count | int | Number of .csproj files found |
| complexity | string | "simple" / "moderate" / "complex" based on project_count |

**Computed**: `overall_score = average(category_scores[].score)` excluding categories where all rules are NA.

### DashboardSummary

Aggregate metrics across all scanned repositories.

| Field | Type | Description |
|-------|------|-------------|
| total_repos | int | Total repositories scanned |
| average_score | float | Mean compliance score across all repos |
| fully_compliant | int | Repos with score >= 90% |
| needs_migration | int | Repos with score < 70% |
| version_distribution | dict[string, int] | Count of repos per .NET version |
| scan_results | RepoScanResult[] | All individual scan results |
| last_scan_time | string (ISO 8601) | When the last scan completed |

### ScanProgress

Real-time scan progress tracking.

| Field | Type | Description |
|-------|------|-------------|
| total | int | Total repos to scan |
| completed | int | Repos scanned so far |
| current_repo | string | Name of repo currently being scanned |
| percentage | float | Completion percentage (0-100) |
| is_scanning | bool | Whether a scan is currently active |
| started_at | string (ISO 8601) | When the scan started |

### CreateStoryRequest

Request to create an ADO work item.

| Field | Type | Description |
|-------|------|-------------|
| repo_name | string | Repository name |
| compliance_score | float | Current compliance score |
| failing_rules | ComplianceResult[] | List of failing rules to include |
| priority | int | Work item priority (1-4) |

### CreateStoryResponse

Response after creating an ADO work item.

| Field | Type | Description |
|-------|------|-------------|
| work_item_id | int | Created work item ID |
| url | string | URL to the work item in ADO |
| title | string | Work item title |

## Relationships

```
DashboardSummary
  └── RepoScanResult[] (1:many)
        ├── RepositoryInfo (1:1)
        ├── ComplianceResult[] (1:many)
        └── CategoryScore[] (1:many, always 7)

ScanProgress (standalone, in-memory state)

CreateStoryRequest → CreateStoryResponse (request/response pair)
  └── references RepoScanResult data
```

## Compliance Categories (7 total)

1. **SDK & Runtime** — Target framework, SDK version, runtime identifiers
2. **Language Features** — C# 14 features (primary constructors, collection expressions, etc.)
3. **Project Configuration** — Nullable, implicit usings, central package management
4. **NuGet & Dependencies** — Package versions, deprecated packages, vulnerability checks
5. **Code Patterns** — Modern async patterns, span usage, minimal APIs
6. **DevOps & CI/CD** — Build pipelines, containerization, health checks
7. **Performance & AOT** — Native AOT readiness, trimming, source generators

## State Transitions

### Scan State Machine

```
IDLE → SCANNING → COMPLETE
  ↑                  │
  └──────────────────┘ (cache expires / user triggers new scan)

SCANNING → ERROR (on failure, returns to IDLE)
```

### Cache Lifecycle

```
MISS → FETCH_FROM_ADO → EVALUATE → CACHE_TO_DISK → HIT
                                                      │
                                              (TTL expires)
                                                      │
                                                    MISS
```
