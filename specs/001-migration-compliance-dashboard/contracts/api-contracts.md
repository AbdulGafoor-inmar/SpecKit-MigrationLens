# API Contracts: MigrationLens Endpoints

**Feature**: 001-migration-compliance-dashboard
**Updated**: 2026-03-27
**Base URL**: `http://localhost:8000/api`

**Note**: All endpoints are under `/api` prefix. Wiki and Boards endpoints are currently disabled (commented out in `main.py`).

---

## GET /api/health

Health check endpoint.

**Response 200** (`HealthResponse`):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-03-27T10:00:00Z"
}
```

---

## GET /api/dashboard

Returns the aggregated dashboard summary from cache.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | no | env default | ADO organization name |
| project | string | no | env default | Filter to a specific project |

**Response 200** (`DashboardSummary`):
```json
{
  "organization": "my-org",
  "project": "Platform",
  "total_repositories": 42,
  "scanned_repositories": 42,
  "average_score": 73.5,
  "passing_repositories": 12,
  "failing_repositories": 18,
  "repositories": [
    {
      "repository": {
        "id": "abc-123",
        "name": "MyService",
        "url": "https://dev.azure.com/org/project/_git/MyService",
        "default_branch": "main",
        "project": "Platform",
        "dotnet_version": "net8.0",
        "app_type": "api"
      },
      "compliance_results": [],
      "category_scores": [
        {
          "category": "SDK & Runtime",
          "score": 80.0,
          "total_rules": 4,
          "passed": 3,
          "failed": 1,
          "not_applicable": 0
        }
      ],
      "overall_score": 75.0,
      "compliance_status": "Needs Migration",
      "dotnet_version": "net8.0",
      "csharp_version": "",
      "complexity": "moderate",
      "project_count": 3
    }
  ],
  "category_averages": {
    "SDK & Runtime": 80.0,
    "Language Features": 65.0
  }
}
```

**Response 404**: No scan data available.
```json
{ "detail": "No scan data found. Trigger a scan first." }
```

---

## POST /api/scan

Triggers a compliance scan of repositories. Runs as a background task.

**Request Body** (`ScanRequest`):
```json
{
  "organization": "my-org",
  "project": "Platform",
  "pat_token": "optional-override-token",
  "repo_ids": ["repo-id-1", "repo-id-2"]
}
```

**Response 202** (`ScanStartResponse`):
```json
{ "message": "Scan started", "total_repos": 42 }
```

**Response 409**: Scan already in progress.
```json
{ "detail": "A scan is already in progress" }
```

---

## POST /api/scan/stop

Stops or resets an in-progress scan.

**Response 200**:
```json
{ "message": "Scan stop requested" }
```

---

## GET /api/scan/progress

Returns current scan progress.

**Response 200** (`ScanProgress`):
```json
{
  "total_repos": 42,
  "scanned_repos": 15,
  "current_repo": "MyService",
  "progress": 35.7,
  "is_scanning": true,
  "message": "Scanning MyService..."
}
```

---

## GET /api/repos

Lists repositories from Azure DevOps (with optional in-memory caching).

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | no | env default | ADO organization |
| project | string | no | env default | ADO project |

**Response 200**: Array of `ADORepository` objects.
```json
[
  {
    "id": "abc-123",
    "name": "MyService",
    "project": "Platform",
    "default_branch": "main",
    "url": "https://dev.azure.com/org/project/_git/MyService"
  }
]
```

---

## GET /api/repos/{repo_id}

Returns detailed scan results for a single repository.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| repo_id | string | Repository ID |

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | no | env default | ADO organization |

**Response 200** (`RepoScanResult`): Full scan result with compliance_results, category_scores, overall_score.

**Response 404**: Repository not found in scan data.

---

## GET /api/repos/{repo_id}/migration-report

Returns a detailed migration report with step-by-step guidance and wiki standards.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| repo_id | string | Repository ID |

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | no | env default | ADO organization |
| project | string | no | env default | ADO project |

**Response 200** (`MigrationReport`):
```json
{
  "repository": { "id": "abc-123", "name": "MyService", "..." : "..." },
  "steps": [
    {
      "step_number": 1,
      "rule_id": "SDK-001",
      "rule_name": "Target Framework is .NET 10",
      "category": "SDK & Runtime",
      "severity": "critical",
      "status": "fail",
      "file_path": "src/MyService/MyService.csproj",
      "line_number": 4,
      "current_code": "<TargetFramework>net8.0</TargetFramework>",
      "suggested_fix": "<TargetFramework>net10.0</TargetFramework>",
      "description": "Project must target .NET 10",
      "migration_guide": "Update TargetFramework in .csproj",
      "wiki_reference": "",
      "wiki_source": ""
    }
  ],
  "total_steps": 15,
  "critical_steps": 3,
  "high_steps": 5,
  "medium_steps": 4,
  "low_steps": 3,
  "passing_rules": 40,
  "failing_rules": 15,
  "overall_score": 72.7,
  "dotnet_version_current": "net8.0",
  "dotnet_version_target": "net10.0",
  "wiki_standards": [],
  "categories_summary": {}
}
```

**Response 404**: Repository not found.

---

## POST /api/workitems

Creates an Azure DevOps work item (User Story) for migration. Includes deduplication.

**Request Body** (`CreateStoryRequest`):
```json
{
  "repo_id": "abc-123",
  "repo_name": "MyService",
  "failing_rules": [
    { "rule_id": "SDK-001", "rule_name": "Target Framework is .NET 10", "category": "SDK & Runtime", "status": "fail", "severity": "critical" }
  ],
  "overall_score": 75.0,
  "priority": 2,
  "organization": "my-org"
}
```

**Response 201** (`CreateStoryResponse`):
```json
{
  "work_item_id": 12345,
  "url": "https://dev.azure.com/org/project/_workitems/edit/12345",
  "title": "[MigrationLens] Migrate MyService to .NET 10 (Score: 75%)"
}
```

---

## GET /api/export

Exports compliance report as JSON or CSV download.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | no | env default | ADO organization |
| format | string | no | "json" | Export format: "json" or "csv" |

**Response 200**: File download with `Content-Disposition` header.

**Response 404**: No scan data to export.

---

## GET /api/settings

Returns non-sensitive application settings.

**Response 200** (`AppSettings`):
```json
{
  "ado_organization": "my-org",
  "ado_project": "Platform",
  "ado_base_url": "https://dev.azure.com/my-org",
  "has_pat": true,
  "backend_url": "http://localhost:8000",
  "cors_origins": "http://localhost:3000",
  "cache_dir": ".cache",
  "cache_ttl": 86400
}
```

---

## GET /api/repos/{repo_id}/ai-analysis

Runs AI code analysis, risk assessment, and migration plan generation in parallel.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| repo_id | string | Repository ID |

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | no | env default | ADO organization |

**Response 200** (`AIAnalysisResponse`):
```json
{
  "code_analysis": {
    "summary": "Repository uses .NET 8 with several modernization opportunities",
    "insights": [
      { "title": "Outdated Framework", "description": "...", "severity": "high", "category": "SDK & Runtime" }
    ],
    "recommendations": [
      { "priority": 1, "action": "Update target framework", "effort": "low", "impact": "high" }
    ]
  },
  "risk_assessment": {
    "risk_level": "medium",
    "risk_score": 45.0,
    "effort_estimate_days": 5,
    "risk_factors": [],
    "mitigation_suggestions": [],
    "confidence": 0.8
  },
  "migration_plan": {
    "phases": [],
    "estimated_total_hours": 40,
    "pr_suggestions": [],
    "breaking_changes": []
  },
  "ai_available": true
}
```

---

## GET /api/ai/health

Check Azure OpenAI connectivity.

**Response 200**:
```json
{ "status": "healthy", "model": "gpt-35-turbo" }
```

**Response 200** (unavailable):
```json
{ "status": "unavailable", "detail": "Azure OpenAI not configured" }
```

---

## GET /api/repos/{repo_id}/pull-requests

Lists pull requests for a repository.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| status | string | no | "active" | PR status filter (active, completed, all) |
| project | string | no | env default | ADO project |

**Response 200**: Array of `PullRequestInfo` objects.

---

## GET /api/repos/{repo_id}/pull-requests/{pr_id}/review

Runs AI PR review (fetches diff + linked work items, sends to Azure OpenAI).

**Response 200** (`PRReviewResult`):
```json
{
  "pr": { "pr_id": 123, "title": "...", "..." : "..." },
  "linked_work_items": [],
  "story_match": "Strong match",
  "acceptance_criteria": [],
  "code_quality_issues": [],
  "business_logic_issues": [],
  "standards_violations": [],
  "risks": [],
  "completeness": { "has_tests": false, "has_docs": false, "..." : "..." },
  "suggestions": [],
  "verdict": "NEEDS_CHANGES",
  "confidence_score": 72.0,
  "confidence_breakdown": [
    { "category": "Story Alignment", "weight": 20, "score": 18, "deductions": [] }
  ],
  "summary": "...",
  "files_changed": []
}
```

---

## POST /api/repos/{repo_id}/pull-requests/{pr_id}/comment

Posts an AI review as a PR comment thread in ADO.

**Request Body**: `PRReviewResult` object.

**Response 200**:
```json
{ "message": "Review posted successfully", "thread_id": 456 }
```

---

## POST /api/autofix/{repo_id}

Starts the auto-fix pipeline. Returns an SSE (Server-Sent Events) stream with real-time progress.

**Request Body** (`AutoFixRequest`):
```json
{
  "failing_rules": ["SDK-001", "LANG-001"],
  "organization": "my-org",
  "project": "Platform"
}
```

**Response 200** (SSE stream): Each event is a JSON `AutoFixStepStatus`:
```
data: {"step": 1, "name": "Creating work item", "status": "running", "details": "..."}
data: {"step": 1, "name": "Creating work item", "status": "completed", "url": "https://..."}
data: {"step": 2, "name": "Generating AI fixes", "status": "running", "details": "..."}
...
data: {"step": 6, "name": "AI PR Review", "status": "completed", "details": "APPROVE (85/100)"}
```

---

## GET /api/wiki *(DISABLED)*

Lists all wikis in a project.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| project | string | no | env default | ADO project name |

**Response 200**: Array of `WikiInfo` objects.

---

## GET /api/wiki/{wiki_id}/page *(DISABLED)*

Returns a single wiki page with content.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| path | string | no | "/" | Wiki page path |
| project | string | no | env default | ADO project |

**Response 200** (`WikiPage`): Page with content and sub_pages.

---

## GET /api/wiki/{wiki_id}/pages *(DISABLED)*

Lists all wiki pages in a tree structure.

**Response 200** (`WikiPageListResponse`): Wiki ID, name, and pages array.

---

## GET /api/boards *(DISABLED)*

Lists all boards in a project/team.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| project | string | no | env default | ADO project |
| team | string | no | "" | Team name |

**Response 200**: Array of `BoardInfo` objects.

---

## GET /api/boards/{board_name} *(DISABLED)*

Returns board columns and associated work items.

**Response 200** (`BoardDetailResponse`): Board name, columns, and work items.

---

## POST /api/boards/query *(DISABLED)*

Executes a custom WIQL query.

**Request Body** (`WorkItemQueryRequest`):
```json
{ "wiql": "SELECT [System.Id] FROM WorkItems WHERE ...", "project": "Platform", "top": 100 }
```

**Response 200** (`WorkItemQueryResponse`): Count and work_items array.

---

## GET /api/boards/workitems/list *(DISABLED)*

Lists work items with optional filters (auto-builds WIQL).

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| project | string | no | env default | ADO project |
| work_item_type | string | no | "User Story" | Filter by type |
| state | string | no | "" | Filter by state |
| tags | string | no | "" | Filter by tag |
| top | int | no | 200 | Max results 1-500 |

**Response 200** (`WorkItemQueryResponse`): Count and work_items array.
