# Data Model: MigrationLens Dashboard

**Feature**: 001-migration-compliance-dashboard
**Date**: 2026-03-12
**Updated**: 2026-03-27

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
| app_type | string | Detected application type: "api", "worker", "cronjob", "library" |

### ComplianceResult

A single compliance rule evaluation result for a repository.

| Field | Type | Description |
|-------|------|-------------|
| rule_id | string | Unique rule identifier (e.g., "SDK-001") |
| rule_name | string | Human-readable rule name |
| category | string | One of 8 categories |
| status | enum | "pass", "fail", "na" (ComplianceStatus) |
| severity | enum | "critical", "high", "medium", "low" (Severity) |
| details | string | Explanation of result or remediation guidance |
| file_path | string (optional) | File where the rule was evaluated |
| line_number | int (optional) | Line number of the issue |
| current_code | string (optional) | Current code snippet |
| suggested_fix | string (optional) | Suggested code fix |
| migration_guide | string (optional) | Migration guidance text |

### CategoryScore

Aggregated score for a compliance category.

| Field | Type | Description |
|-------|------|-------------|
| category | string | Category name (e.g., "SDK & Runtime") |
| score | float | Percentage score (0.0 - 100.0) |
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
| compliance_status | string | "Compliant", "Needs Migration", etc. |
| dotnet_version | string | Detected .NET version |
| csharp_version | string | Detected C# version |
| complexity | string | "simple" / "moderate" / "complex" |
| project_count | int | Number of .csproj files found |

**Computed**: `overall_score = average(category_scores[].score)` excluding categories where all rules are NA.

### DashboardSummary

Aggregate metrics across all scanned repositories.

| Field | Type | Description |
|-------|------|-------------|
| organization | string | ADO organization name |
| project | string | ADO project filter |
| total_repositories | int | Total repositories found |
| scanned_repositories | int | Repositories actually scanned |
| average_score | float | Mean compliance score |
| passing_repositories | int | Repos with passing status |
| failing_repositories | int | Repos with failing status |
| repositories | RepoScanResult[] | All individual scan results |
| category_averages | dict[string, float] | Average score per category across all repos |

### ScanProgress

Real-time scan progress tracking.

| Field | Type | Description |
|-------|------|-------------|
| total_repos | int | Total repos to scan |
| scanned_repos | int | Repos scanned so far |
| current_repo | string | Name of repo currently being scanned |
| progress | float | Completion percentage (0-100) |
| is_scanning | bool | Whether a scan is currently active |
| message | string | Status message |

### ScanRequest

Request to start a compliance scan.

| Field | Type | Description |
|-------|------|-------------|
| organization | string | ADO organization name (optional) |
| project | string | ADO project filter (optional) |
| pat_token | string | Override PAT (optional) |
| repo_ids | string[] | Specific repo IDs to scan (optional) |

### CreateStoryRequest / CreateStoryResponse

Request/response for creating ADO work items.

| Field (Request) | Type | Description |
|-------|------|-------------|
| repo_id | string | Repository ID |
| repo_name | string | Repository name |
| failing_rules | ComplianceResult[] | Failing rules to include |
| overall_score | float | Current compliance score |
| priority | int | Work item priority (1-4) |
| organization | string | ADO organization |

| Field (Response) | Type | Description |
|-------|------|-------------|
| work_item_id | int | Created/existing work item ID |
| url | string | URL to the work item in ADO |
| title | string | Work item title |

### MigrationStep

A single step in a repository's migration guide.

| Field | Type | Description |
|-------|------|-------------|
| step_number | int | Order of the step |
| rule_id | string | Compliance rule ID |
| rule_name | string | Rule name |
| category | string | Compliance category |
| severity | enum | critical/high/medium/low |
| status | enum | pass/fail/na |
| file_path | string | Affected file |
| line_number | int | Line number |
| current_code | string | Current code snippet |
| suggested_fix | string | Suggested code fix |
| description | string | Rule description |
| migration_guide | string | Migration guidance |
| wiki_reference | string | Related wiki page reference |
| wiki_source | string | Source wiki identifier |

### WikiStandard

An actionable standard extracted from wiki pages.

| Field | Type | Description |
|-------|------|-------------|
| title | string | Standard title |
| source_page | string | Wiki page path |
| wiki_name | string | Wiki name |
| content_summary | string | Summary of the standard |
| related_rules | string[] | Related compliance rule IDs |
| url | string | Link to wiki page |

### MigrationReport

Complete migration report for a repository.

| Field | Type | Description |
|-------|------|-------------|
| repository | RepositoryInfo | Repository metadata |
| steps | MigrationStep[] | Ordered migration steps |
| total_steps | int | Total steps |
| critical_steps | int | Critical severity count |
| high_steps | int | High severity count |
| medium_steps | int | Medium severity count |
| low_steps | int | Low severity count |
| passing_rules | int | Passing rules count |
| failing_rules | int | Failing rules count |
| overall_score | float | Compliance score |
| dotnet_version_current | string | Current .NET version |
| dotnet_version_target | string | Target .NET version ("net10.0") |
| wiki_standards | WikiStandard[] | Extracted wiki standards |
| categories_summary | dict[string, CategoryScore] | Per-category summary |

### WikiInfo

Represents a wiki discovered from Azure DevOps.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Wiki identifier (default: "") |
| name | string | Wiki name (default: "") |
| type | string | "projectWiki" or "codeWiki" (default: "") |
| url | string | Wiki URL (default: "") |
| project_id | string | Associated ADO project ID (default: "") |
| repository_id | string | Backing Git repository ID (default: "") |

### WikiPage

A single wiki page with optional sub-pages (self-referential/recursive).

| Field | Type | Description |
|-------|------|-------------|
| id | int | Page identifier (default: 0) |
| path | string | Page path (e.g., "/Architecture/Overview") |
| content | string | Content of the page (default: "") |
| git_item_path | string | Path in backing Git repository (default: "") |
| sub_pages | WikiPage[] | Child pages (recursive, default: []) |
| remote_url | string | ADO remote URL (default: "") |
| order | int | Page ordering (default: 0) |

### WikiPageListResponse

Response for listing wiki pages.

| Field | Type | Description |
|-------|------|-------------|
| wiki_id | string | Wiki identifier |
| wiki_name | string | Wiki display name |
| pages | WikiPage[] | List of wiki pages |

### WorkItemInfo

Represents a single Azure DevOps work item.

| Field | Type | Description |
|-------|------|-------------|
| id | int | Work item ID |
| title | string | Work item title |
| state | string | Work item state (New, Active, Closed, etc.) |
| work_item_type | string | Type (User Story, Bug, Task, Epic, Feature) |
| assigned_to | string | Display name of assignee |
| priority | int | Priority 1-4 |
| tags | string | Semicolon-separated tags |
| created_date | string | ISO 8601 creation timestamp |
| changed_date | string | ISO 8601 last-modified timestamp |
| url | string | HTML link to work item in ADO |

### WorkItemQueryRequest / WorkItemQueryResponse

| Field (Request) | Type | Description |
|-------|------|-------------|
| wiql | string | WIQL query string |
| project | string | ADO project scope |
| top | int | Max results 1-500 (default: 200) |

| Field (Response) | Type | Description |
|-------|------|-------------|
| count | int | Number of work items returned |
| work_items | WorkItemInfo[] | List of matching work items |

### BoardInfo

| Field | Type | Description |
|-------|------|-------------|
| id | string | Board identifier |
| name | string | Board name (Stories, Bugs, etc.) |
| url | string | Board API URL |

### BoardColumn

| Field | Type | Description |
|-------|------|-------------|
| id | string | Column identifier |
| name | string | Column name (New, Active, Resolved, etc.) |
| item_limit | int | WIP limit |
| state_mappings | dict[string, string] | Maps work item type to state |

### BoardDetailResponse

| Field | Type | Description |
|-------|------|-------------|
| board_name | string | Board name |
| columns | BoardColumn[] | Ordered board columns |
| work_items | WorkItemInfo[] | Work items on the board |

### AI Analysis Models

#### AIInsight / AIRecommendation / AICodeAnalysis

| Field | Type | Description |
|-------|------|-------------|
| summary | string | Analysis summary (AICodeAnalysis) |
| insights | AIInsight[] | List of insights with title, description, severity, category |
| recommendations | AIRecommendation[] | Prioritized recommendations with action, effort, impact |

#### AIRiskAssessment

| Field | Type | Description |
|-------|------|-------------|
| risk_level | string | Overall risk level |
| risk_score | float | Risk score 0-100 |
| effort_estimate_days | int | Estimated migration days |
| risk_factors | AIRiskFactor[] | Individual risk factors |
| mitigation_suggestions | string[] | Mitigation strategies |
| confidence | float | Confidence score |

#### AIMigrationPlan

| Field | Type | Description |
|-------|------|-------------|
| phases | AIMigrationPhase[] | Ordered migration phases with tasks |
| estimated_total_hours | int | Total estimated effort |
| pr_suggestions | AIPRSuggestion[] | Suggested PRs with files to change |
| breaking_changes | AIBreakingChange[] | Breaking changes with mitigation |

#### AIAnalysisResponse

| Field | Type | Description |
|-------|------|-------------|
| code_analysis | AICodeAnalysis | Code analysis results |
| risk_assessment | AIRiskAssessment | Risk assessment results |
| migration_plan | AIMigrationPlan | Migration plan |
| ai_available | bool | Whether AI was used (vs fallback) |

### PR Review Models

#### PullRequestInfo

| Field | Type | Description |
|-------|------|-------------|
| pr_id | int | Pull request ID |
| title | string | PR title |
| description | string | PR description |
| status | string | PR status (active, completed, abandoned) |
| source_branch | string | Source branch |
| target_branch | string | Target branch |
| created_by | string | Author display name |
| repo_id | string | Repository ID |
| repo_name | string | Repository name |

#### PRReviewResult

| Field | Type | Description |
|-------|------|-------------|
| pr | PullRequestInfo | PR metadata |
| linked_work_items | PRLinkedWorkItem[] | Linked work items |
| story_match | string | Story alignment assessment |
| acceptance_criteria | PRAcceptanceCriterionResult[] | AC evaluation |
| business_logic_issues | PRBusinessLogicIssue[] | Business logic issues |
| code_quality_issues | PRCodeQualityIssue[] | Code quality issues |
| standards_violations | PRStandardsViolation[] | Standards violations |
| risks | PRRisk[] | Identified risks |
| completeness | PRCompleteness | Completeness check |
| suggestions | PRSuggestion[] | Improvement suggestions |
| verdict | string | APPROVE / NEEDS_CHANGES / BLOCK |
| confidence_score | float | Overall confidence 0-100 |
| confidence_breakdown | PRConfidenceBreakdown[] | 7-dimension scoring |
| summary | string | Review summary |
| files_changed | list | Files modified in the PR |

### Auto-Fix Models

#### AutoFixRequest

| Field | Type | Description |
|-------|------|-------------|
| failing_rules | string[] | Rule IDs to fix (optional — all if empty) |
| organization | string | ADO organization |
| project | string | ADO project |

#### AutoFixStepStatus

| Field | Type | Description |
|-------|------|-------------|
| step | int | Step number (1-6) |
| name | string | Step name |
| status | string | pending / running / completed / failed |
| details | string | Status details |
| url | string | Result URL (if applicable) |
| data | dict | Additional step data |

#### AutoFixResult

| Field | Type | Description |
|-------|------|-------------|
| repo_id | string | Repository ID |
| repo_name | string | Repository name |
| story_id / story_url | int / string | Created work item |
| branch_name | string | Feature branch name |
| pr_id / pr_url | int / string | Created PR |
| files_changed | int | Number of files changed |
| review_verdict / review_score | string / float | AI review results |
| steps | AutoFixStepStatus[] | All 6 step statuses |
| status | string | Overall status |
| error | string | Error message (if any) |

## Relationships

```
DashboardSummary
  └── RepoScanResult[] (1:many)
        ├── RepositoryInfo (1:1)
        ├── ComplianceResult[] (1:many)
        └── CategoryScore[] (1:many, up to 8)

MigrationReport
  ├── RepositoryInfo (1:1)
  ├── MigrationStep[] (1:many, derived from ComplianceResult)
  ├── WikiStandard[] (1:many)
  └── CategoryScore[] (keyed by category name)

AIAnalysisResponse
  ├── AICodeAnalysis (1:1)
  │   ├── AIInsight[] (1:many)
  │   └── AIRecommendation[] (1:many)
  ├── AIRiskAssessment (1:1)
  │   └── AIRiskFactor[] (1:many)
  └── AIMigrationPlan (1:1)
      ├── AIMigrationPhase[] (1:many)
      │   └── AIMigrationTask[] (1:many)
      ├── AIPRSuggestion[] (1:many)
      └── AIBreakingChange[] (1:many)

PRReviewResult
  ├── PullRequestInfo (1:1)
  ├── PRLinkedWorkItem[] (1:many)
  ├── PRAcceptanceCriterionResult[] (1:many)
  ├── PRCodeQualityIssue[] (1:many)
  ├── PRBusinessLogicIssue[] (1:many)
  ├── PRStandardsViolation[] (1:many)
  ├── PRRisk[] (1:many)
  ├── PRCompleteness (1:1)
  ├── PRSuggestion[] (1:many)
  └── PRConfidenceBreakdown[] (1:many, 7 dimensions)

AutoFixResult
  └── AutoFixStepStatus[] (1:many, exactly 6)

ScanProgress (standalone, in-memory state on scanner singleton)

WikiInfo[] (standalone, fetched from ADO Wiki API)
WikiPageListResponse
  └── WikiPage[] (1:many, recursive via sub_pages)

BoardInfo[] (standalone, fetched from ADO Boards API)
BoardDetailResponse
  ├── BoardColumn[] (1:many, ordered)
  └── WorkItemInfo[] (1:many)

CreateStoryRequest → CreateStoryResponse (request/response pair)
WorkItemQueryRequest → WorkItemQueryResponse (request/response pair)
```

## Compliance Categories (8 total)

1. **SDK & Runtime** — Target framework, SDK version, runtime identifiers (4 rules)
2. **Language Features** — C# 14 features: language version, primary constructors, etc. (4 rules)
3. **Project Configuration** — Nullable, implicit usings, central package management (5 rules)
4. **NuGet & Dependencies** — Package versions, deprecated packages, vulnerability checks (7 rules)
5. **Code Patterns** — Modern async patterns, span usage, minimal APIs (11 rules)
6. **DevOps & CI/CD** — Build pipelines, containerization, health checks (8 rules)
7. **AKS & Kubernetes** — Kubernetes deployment, service mesh, observability (12 rules)
8. **Performance & AOT** — Native AOT readiness, trimming, source generators (4 rules)

## State Transitions

### Scan State Machine

```
IDLE → SCANNING → COMPLETE
  ↑                  │
  └──────────────────┘ (cache expires / user triggers new scan)

SCANNING → ERROR (on failure, returns to IDLE)
SCANNING → CANCELLED (on user stop, partial results saved)
```

### Cache Lifecycle

```
MISS → CHECK_MEMORY → HIT (if in-memory TTL valid)
                    → CHECK_DISK → HIT (if file TTL valid, also populate memory)
                                 → MISS → FETCH_FROM_ADO → EVALUATE → SAVE (memory + disk)
```

### Auto-Fix Pipeline State Machine

```
For each step 1-6:
  PENDING → RUNNING → COMPLETED
                    → FAILED (continue with next steps or skip dependent steps)
```
