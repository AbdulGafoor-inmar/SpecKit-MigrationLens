# API Contracts: Dashboard Endpoints

**Feature**: 001-migration-compliance-dashboard
**Base URL**: `http://localhost:8000/api`

---

## GET /api/health

Health check endpoint.

**Response 200**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-03-12T10:00:00Z"
}
```

---

## GET /api/dashboard

Returns the aggregated dashboard summary. Uses cached data if available.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | yes | — | ADO organization name |
| project | string | no | — | Filter to a specific project |

**Response 200** (`DashboardSummary`):
```json
{
  "total_repos": 42,
  "average_score": 73.5,
  "fully_compliant": 12,
  "needs_migration": 18,
  "version_distribution": {
    "net8.0": 20,
    "net6.0": 15,
    "net10.0": 7
  },
  "scan_results": [
    {
      "repository": {
        "id": "abc-123",
        "name": "MyService",
        "url": "https://dev.azure.com/org/project/_git/MyService",
        "default_branch": "main",
        "project": "Platform",
        "dotnet_version": "net8.0",
        "last_commit_date": "2026-03-10T14:30:00Z"
      },
      "compliance_results": [],
      "category_scores": [
        {
          "category": "SDK & Runtime",
          "score": 80.0,
          "total_rules": 5,
          "passed": 4,
          "failed": 1,
          "not_applicable": 0
        }
      ],
      "overall_score": 75.0,
      "scan_timestamp": "2026-03-12T09:00:00Z",
      "project_count": 3,
      "complexity": "moderate"
    }
  ],
  "last_scan_time": "2026-03-12T09:00:00Z"
}
```

**Response 404**: No scan data available yet.
```json
{
  "detail": "No scan data found. Trigger a scan first."
}
```

---

## POST /api/scan

Triggers a compliance scan of repositories. Returns immediately; use /api/scan/progress to track.

**Request Body**:
```json
{
  "organization": "my-org",
  "project": "Platform",
  "pat_token": "optional-override-token"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization | string | yes | ADO organization |
| project | string | no | Filter to specific project |
| pat_token | string | no | Override PAT (default from env) |

**Response 202**:
```json
{
  "message": "Scan started",
  "total_repos": 42
}
```

**Response 409**: Scan already in progress.
```json
{
  "detail": "A scan is already in progress"
}
```

---

## GET /api/scan/progress

Returns current scan progress.

**Response 200** (`ScanProgress`):
```json
{
  "total": 42,
  "completed": 15,
  "current_repo": "MyService",
  "percentage": 35.7,
  "is_scanning": true,
  "started_at": "2026-03-12T09:00:00Z"
}
```

---

## GET /api/repos/{repo_id}

Returns detailed compliance results for a single repository.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| repo_id | string | Repository ID |

**Response 200** (`RepoScanResult`):
```json
{
  "repository": { "..." : "..." },
  "compliance_results": [
    {
      "rule_id": "SDK-001",
      "rule_name": "Target Framework is .NET 10",
      "category": "SDK & Runtime",
      "status": "fail",
      "severity": "critical",
      "details": "Project targets net8.0, expected net10.0",
      "file_path": "src/MyService/MyService.csproj"
    }
  ],
  "category_scores": [],
  "overall_score": 75.0,
  "scan_timestamp": "2026-03-12T09:00:00Z",
  "project_count": 3,
  "complexity": "moderate"
}
```

**Response 404**: Repository not found in scan data.

---

## POST /api/workitems

Creates an Azure DevOps work item (User Story) for migration tasks.

**Request Body** (`CreateStoryRequest`):
```json
{
  "repo_name": "MyService",
  "compliance_score": 75.0,
  "failing_rules": [
    {
      "rule_id": "SDK-001",
      "rule_name": "Target Framework is .NET 10",
      "category": "SDK & Runtime",
      "status": "fail",
      "severity": "critical",
      "details": "Project targets net8.0, expected net10.0"
    }
  ],
  "priority": 2
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

**Response 400**: Invalid request body.
**Response 502**: ADO API failure.

---

## GET /api/export

Exports compliance report in specified format.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| organization | string | yes | — | ADO organization |
| format | string | no | "json" | Export format: "json" or "csv" |

**Response 200**: File download.
- `Content-Type: application/json` or `text/csv`
- `Content-Disposition: attachment; filename="migration-report-{date}.{ext}"`

**Response 404**: No scan data to export.

---

## GET /api/wiki

Lists all wikis (project and code wikis) in the configured Azure DevOps project.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| project | string | no | "" | ADO project name (uses env default if empty) |

**Response 200** (`list[WikiInfo]`):
```json
[
  {
    "id": "wiki-guid-123",
    "name": "Platform.wiki",
    "type": "projectWiki",
    "url": "https://dev.azure.com/org/project/_apis/wiki/wikis/wiki-guid-123",
    "project_id": "proj-guid",
    "repository_id": "repo-guid"
  }
]
```

---

## GET /api/wiki/{wiki_id}/page

Returns a single wiki page with its Markdown content.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| wiki_id | string | Wiki identifier |

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| path | string | no | "/" | Wiki page path (e.g., "/Architecture/Overview") |
| project | string | no | "" | ADO project name |

**Response 200** (`WikiPage`):
```json
{
  "id": 42,
  "path": "/Architecture/Overview",
  "content": "# Architecture Overview\n\nThis document describes...",
  "git_item_path": "/Architecture/Overview.md",
  "sub_pages": [],
  "remote_url": "https://dev.azure.com/org/project/_wiki/wikis/wiki-guid/42/Overview",
  "order": 0
}
```

---

## GET /api/wiki/{wiki_id}/pages

Lists all wiki pages in a tree structure for a given wiki.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| wiki_id | string | Wiki identifier |

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| path | string | no | "/" | Root path to list from |
| project | string | no | "" | ADO project name |

**Response 200** (`WikiPageListResponse`):
```json
{
  "wiki_id": "wiki-guid-123",
  "wiki_name": "Platform.wiki",
  "pages": [
    {
      "id": 1,
      "path": "/Home",
      "content": "",
      "git_item_path": "/Home.md",
      "sub_pages": [
        {
          "id": 2,
          "path": "/Home/Getting-Started",
          "content": "",
          "git_item_path": "/Home/Getting-Started.md",
          "sub_pages": [],
          "remote_url": "",
          "order": 0
        }
      ],
      "remote_url": "",
      "order": 0
    }
  ]
}
```

---

## GET /api/boards

Lists all boards in a project/team.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| project | string | no | "" | ADO project name |
| team | string | no | "" | Team name (uses default team if empty) |

**Response 200** (`list[BoardInfo]`):
```json
[
  {
    "id": "board-guid-123",
    "name": "Stories",
    "url": "https://dev.azure.com/org/project/_apis/work/boards/Stories"
  },
  {
    "id": "board-guid-456",
    "name": "Bugs",
    "url": "https://dev.azure.com/org/project/_apis/work/boards/Bugs"
  }
]
```

---

## GET /api/boards/{board_name}

Returns board column configuration and associated work items.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| board_name | string | Board name (e.g., "Stories", "Bugs") |

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| project | string | no | "" | ADO project name |
| team | string | no | "" | Team name |

**Response 200** (`BoardDetailResponse`):
```json
{
  "board_name": "Stories",
  "columns": [
    {
      "id": "col-guid-1",
      "name": "New",
      "item_limit": 0,
      "state_mappings": { "User Story": "New" }
    },
    {
      "id": "col-guid-2",
      "name": "Active",
      "item_limit": 5,
      "state_mappings": { "User Story": "Active" }
    }
  ],
  "work_items": [
    {
      "id": 12345,
      "title": "Migrate MyService to .NET 10",
      "state": "Active",
      "work_item_type": "User Story",
      "assigned_to": "Jane Smith",
      "priority": 2,
      "tags": "migration;net10",
      "created_date": "2026-03-01T10:00:00Z",
      "changed_date": "2026-03-12T14:30:00Z",
      "url": "https://dev.azure.com/org/project/_workitems/edit/12345"
    }
  ]
}
```

---

## POST /api/boards/query

Executes a custom WIQL (Work Item Query Language) query.

**Request Body** (`WorkItemQueryRequest`):
```json
{
  "wiql": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'User Story' AND [System.State] = 'Active'",
  "project": "Platform",
  "top": 100
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| wiql | string | yes | WIQL query string |
| project | string | no | ADO project scope |
| top | int | no | Max results 1-500 (default: 200) |

**Response 200** (`WorkItemQueryResponse`):
```json
{
  "count": 3,
  "work_items": [
    {
      "id": 12345,
      "title": "Migrate MyService to .NET 10",
      "state": "Active",
      "work_item_type": "User Story",
      "assigned_to": "Jane Smith",
      "priority": 2,
      "tags": "migration",
      "created_date": "2026-03-01T10:00:00Z",
      "changed_date": "2026-03-12T14:30:00Z",
      "url": "https://dev.azure.com/org/project/_workitems/edit/12345"
    }
  ]
}
```

**Response 422**: Invalid WIQL syntax.

---

## GET /api/boards/workitems/list

Lists work items with optional filters, auto-building a WIQL query from parameters.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| project | string | no | "" | ADO project name |
| work_item_type | string | no | "User Story" | Filter by type (User Story, Bug, Task, Epic, Feature) |
| state | string | no | "" | Filter by state (New, Active, Resolved, Closed) |
| tags | string | no | "" | Filter by tag (contains match) |
| top | int | no | 200 | Max results 1-500 |

**Response 200** (`WorkItemQueryResponse`):
```json
{
  "count": 15,
  "work_items": [
    {
      "id": 12345,
      "title": "Migrate MyService to .NET 10",
      "state": "Active",
      "work_item_type": "User Story",
      "assigned_to": "Jane Smith",
      "priority": 2,
      "tags": "migration;net10",
      "created_date": "2026-03-01T10:00:00Z",
      "changed_date": "2026-03-12T14:30:00Z",
      "url": "https://dev.azure.com/org/project/_workitems/edit/12345"
    }
  ]
}
```
