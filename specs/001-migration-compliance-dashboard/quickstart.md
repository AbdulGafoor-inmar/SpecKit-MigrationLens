# Quickstart & Integration Tests

**Feature**: 001-migration-compliance-dashboard
**Updated**: 2026-03-27

## Prerequisites

- Python 3.12+
- Node.js 18+
- Docker & Docker Compose (optional)
- Azure DevOps PAT with **Code (Read)** and **Work Items (Read & Write)** scope
- Azure OpenAI endpoint (optional — system falls back to rule-based analysis)

## Environment Variables

```bash
# Required — Azure DevOps
ADO_PAT=<your-personal-access-token>
ADO_ORGANIZATION=<your-org-name>
ADO_PROJECT=<optional-project-filter>

# Optional — Azure OpenAI
AZURE_OPENAI_ENDPOINT=<your-endpoint>
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=gpt-35-turbo
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# Optional — Cache
CACHE_DIR=.cache
CACHE_TTL=86400

# Optional — Server
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000
```

**PAT Scope Requirements**:
- **Code (Read)** — repository scanning, file content
- **Code (Write)** — auto-fix branch/push/PR creation
- **Work Items (Read & Write)** — work item creation, boards, WIQL queries
- **Wiki (Read)** — wiki page browsing

## Quick Start (Docker Compose)

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Quick Start (Local Development)

### Backend
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000/api npm run dev
# Open http://localhost:3000
```

## Integration Test Scenarios

### Scenario 1: Health Check
```
GET /api/health
Expected: 200, body contains { "status": "healthy" }
```

### Scenario 2: Dashboard with No Scan Data
```
GET /api/dashboard
Expected: 404, body contains "No scan data found"
```

### Scenario 3: List Repositories
```
GET /api/repos
Expected: 200, body is array of ADO repositories (or empty array)
```

### Scenario 4: Trigger Scan
```
POST /api/scan
Body: { "organization": "my-org" }
Expected: 202, body contains { "message": "Scan started" }
```

### Scenario 5: Check Scan Progress
```
GET /api/scan/progress
Expected: 200, body contains is_scanning boolean, progress float
```

### Scenario 6: Duplicate Scan Prevention
```
POST /api/scan (while scan is running)
Expected: 409, body contains "already in progress"
```

### Scenario 7: Stop Scan
```
POST /api/scan/stop
Expected: 200, body contains "stop requested"
```

### Scenario 8: Get Dashboard After Scan
```
GET /api/dashboard
Expected: 200, body has total_repositories > 0, repositories array
```

### Scenario 9: Repo Detail
```
GET /api/repos/{repo_id}
Expected: 200, body has compliance_results array, category_scores array
```

### Scenario 10: Migration Report
```
GET /api/repos/{repo_id}/migration-report
Expected: 200, body has steps array, total_steps, severity counts, wiki_standards
```

### Scenario 11: Create Work Item
```
POST /api/workitems
Body: { "repo_id": "abc", "repo_name": "MyService", "failing_rules": [...], "overall_score": 75, "priority": 2, "organization": "my-org" }
Expected: 201, body has work_item_id, url, title
```

### Scenario 12: Export JSON
```
GET /api/export?format=json
Expected: 200, Content-Type: application/json, Content-Disposition header
```

### Scenario 13: Export CSV
```
GET /api/export?format=csv
Expected: 200, Content-Type: text/csv, Content-Disposition header
```

### Scenario 14: Get Settings
```
GET /api/settings
Expected: 200, body has ado_organization, has_pat boolean
```

### Scenario 15: AI Analysis
```
GET /api/repos/{repo_id}/ai-analysis
Expected: 200, body has code_analysis, risk_assessment, migration_plan, ai_available
```

### Scenario 16: AI Health Check
```
GET /api/ai/health
Expected: 200, body has status ("healthy" or "unavailable")
```

### Scenario 17: List Pull Requests
```
GET /api/repos/{repo_id}/pull-requests?status=active
Expected: 200, body is array of PullRequestInfo objects
```

### Scenario 18: Run PR Review
```
GET /api/repos/{repo_id}/pull-requests/{pr_id}/review
Expected: 200, body has verdict, confidence_score, confidence_breakdown
```

### Scenario 19: Post PR Comment
```
POST /api/repos/{repo_id}/pull-requests/{pr_id}/comment
Body: { ...PRReviewResult }
Expected: 200, body has message, thread_id
```

### Scenario 20: Start Auto-Fix (SSE)
```
POST /api/autofix/{repo_id}
Body: { "organization": "my-org" }
Expected: 200, Content-Type: text/event-stream, SSE events with step progress
```

### Scenario 21: Cache Behavior
```
1. GET /api/dashboard → 200
2. Wait < cache TTL
3. GET /api/dashboard → 200 (same data, served from cache)
```

### Scenario 22: Repo Not Found
```
GET /api/repos/nonexistent
Expected: 404
```

## Smoke Test Script

```bash
# Run after starting backend
curl -s http://localhost:8000/api/health | jq .
curl -s http://localhost:8000/api/settings | jq .
curl -s http://localhost:8000/api/ai/health | jq .
curl -s -X POST http://localhost:8000/api/scan -H "Content-Type: application/json" -d '{"organization":"my-org"}' | jq .
sleep 30
curl -s http://localhost:8000/api/scan/progress | jq .
curl -s http://localhost:8000/api/dashboard | jq .total_repositories
```
