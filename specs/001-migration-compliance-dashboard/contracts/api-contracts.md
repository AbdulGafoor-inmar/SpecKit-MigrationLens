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
