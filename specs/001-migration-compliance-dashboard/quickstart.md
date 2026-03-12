# Quickstart & Integration Tests

**Feature**: 001-migration-compliance-dashboard

## Prerequisites

- Python 3.12+
- Node.js 18+
- Docker & Docker Compose (optional)
- Azure DevOps PAT with **Code (Read)** and **Work Items (Read & Write)** scope

## Environment Variables

```bash
ADO_PAT=<your-personal-access-token>
ADO_ORGANIZATION=<your-org-name>
ADO_PROJECT=<optional-project-filter>
```

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
npm run dev
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
GET /api/dashboard?organization=test-org
Expected: 404, body contains "No scan data found"
```

### Scenario 3: Trigger Scan
```
POST /api/scan
Body: { "organization": "test-org" }
Expected: 202, body contains { "message": "Scan started" }
```

### Scenario 4: Check Scan Progress
```
GET /api/scan/progress
Expected: 200, body contains is_scanning boolean, percentage float
```

### Scenario 5: Duplicate Scan Prevention
```
POST /api/scan (while scan is running)
Expected: 409, body contains "already in progress"
```

### Scenario 6: Get Dashboard After Scan
```
GET /api/dashboard?organization=test-org
Expected: 200, body has total_repos > 0, scan_results array
```

### Scenario 7: Repo Detail
```
GET /api/repos/{repo_id}
Expected: 200, body has compliance_results array, category_scores array
```

### Scenario 8: Create Work Item
```
POST /api/workitems
Body: { "repo_name": "MyService", "compliance_score": 75, "failing_rules": [...], "priority": 2 }
Expected: 201, body has work_item_id, url, title
```

### Scenario 9: Export JSON
```
GET /api/export?organization=test-org&format=json
Expected: 200, Content-Type: application/json, Content-Disposition header
```

### Scenario 10: Export CSV
```
GET /api/export?organization=test-org&format=csv
Expected: 200, Content-Type: text/csv, Content-Disposition header
```

### Scenario 11: Invalid Organization
```
POST /api/scan
Body: { "organization": "" }
Expected: 422, validation error
```

### Scenario 12: Cache Behavior
```
1. GET /api/dashboard → 200
2. Wait < cache TTL
3. GET /api/dashboard → 200 (same scan_timestamp, served from cache)
```

## Smoke Test Script

```bash
# Run after docker compose up
curl -s http://localhost:8000/api/health | jq .
curl -s -X POST http://localhost:8000/api/scan -H "Content-Type: application/json" -d '{"organization":"my-org"}' | jq .
sleep 30
curl -s http://localhost:8000/api/dashboard?organization=my-org | jq .total_repos
curl -s http://localhost:8000/api/export?organization=my-org&format=csv -o report.csv
```
