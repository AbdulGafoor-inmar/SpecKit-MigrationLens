# Implementation Plan: MigrationLens Dashboard

**Branch**: `001-migration-compliance-dashboard` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-migration-compliance-dashboard/spec.md`

## Summary

Build an AI-powered .NET 10 / C# 14 Modernization Compliance Dashboard that scans Azure DevOps repositories, evaluates compliance against 30+ rules across 7 categories, and presents results in a premium dark-themed UI with glassmorphism styling. Backend is Python/FastAPI with YAML-defined compliance rules; frontend is Next.js 14 with Tailwind CSS, Recharts, and Framer Motion.

## Technical Context

**Language/Version**: Python 3.12+ (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI 0.110+, Pydantic v2, httpx, PyYAML, structlog (backend); Next.js 14, React 18, Tailwind CSS 3.4+, Recharts 2.x, Framer Motion 11.x, Lucide React (frontend)
**Storage**: JSON file cache on disk (no database per Constitution Principle III)
**Testing**: pytest + httpx (backend), Jest + React Testing Library (frontend)
**Target Platform**: Docker containers (Linux), cross-platform local dev
**Project Type**: web-service (full-stack dashboard)
**Performance Goals**: Dashboard load < 2s, scan 100 repos < 5 min, SSE progress updates < 500ms latency
**Constraints**: No database, file-based persistence only, ADO PAT required for API access
**Scale/Scope**: ~100-500 repos per organization, 30+ compliance rules, 7 categories, 6 pages/views

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | PASS | Full SDD lifecycle followed: constitution → spec → plan → tasks → implement |
| II. Full-Stack Dashboard | PASS | FastAPI backend + Next.js frontend as specified |
| III. No Database | PASS | JSON file cache only, no SQL/NoSQL dependencies |
| IV. Premium Dark UI | PASS | Tailwind dark theme + glassmorphism + Framer Motion planned |
| V. ADO Integration First | PASS | httpx async client for ADO REST API, PAT-based auth |

## Project Structure

### Documentation (this feature)

```text
specs/001-migration-compliance-dashboard/
├── plan.md              # This file
├── spec.md              # Feature specification (6 user stories)
├── research.md          # Technical decisions (10 decisions)
├── data-model.md        # Entity definitions & relationships
├── quickstart.md        # Integration test scenarios
├── contracts/
│   └── api-contracts.md # REST API endpoint contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py            # Settings from env vars
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py       # Pydantic v2 models (all entities)
│   │   └── enums.py         # Status, Severity enums
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ado_client.py    # Azure DevOps REST API client (httpx)
│   │   ├── scanner.py       # Repository scanning orchestrator
│   │   ├── compliance.py    # Rule engine (YAML-driven evaluation)
│   │   ├── cache.py         # JSON file cache manager
│   │   └── workitems.py     # ADO work item creation
│   ├── api/
│   │   ├── __init__.py
│   │   ├── dashboard.py     # GET /api/dashboard
│   │   ├── scan.py          # POST /api/scan, GET /api/scan/progress
│   │   ├── repos.py         # GET /api/repos/{repo_id}
│   │   ├── workitems.py     # POST /api/workitems
│   │   ├── export.py        # GET /api/export
│   │   └── health.py        # GET /api/health
│   └── rules/
│       └── compliance-rules.yaml  # 30+ compliance rule definitions
├── tests/
│   ├── conftest.py
│   ├── test_compliance.py
│   ├── test_scanner.py
│   ├── test_api.py
│   └── test_cache.py
├── requirements.txt
├── Dockerfile
└── .env.example

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with dark theme
│   │   ├── page.tsx         # Dashboard page (US1)
│   │   ├── globals.css      # Tailwind + glassmorphism utilities
│   │   └── repos/
│   │       └── [id]/
│   │           └── page.tsx # Repo detail page (US3)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── GlassCard.tsx
│   │   │   ├── ScoreRing.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── AnimatedCounter.tsx
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── RepoTable.tsx
│   │   │   ├── VersionDistribution.tsx
│   │   │   └── CategoryBreakdown.tsx
│   │   ├── charts/
│   │   │   ├── ComplianceRadar.tsx
│   │   │   ├── ScoreTrend.tsx
│   │   │   └── VersionPieChart.tsx
│   │   ├── scan/
│   │   │   ├── ScanButton.tsx
│   │   │   └── ScanProgress.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── api.ts           # Backend API client (fetch wrapper)
│   │   └── types.ts         # TypeScript interfaces matching data-model
│   └── hooks/
│       ├── useDashboard.ts
│       ├── useScanProgress.ts
│       └── useRepoDetail.ts
├── tailwind.config.ts
├── next.config.js
├── package.json
├── tsconfig.json
└── Dockerfile

# Root infrastructure
docker-compose.yml
.gitignore
README.md
.env.example
```

**Structure Decision**: Web application (Option 2) with separate `backend/` and `frontend/` directories. Backend is a Python/FastAPI REST API, frontend is a Next.js 14 SSR application. Both are containerized with Docker and orchestrated via `docker-compose.yml`.

## Complexity Tracking

No constitution violations detected. All design decisions comply with the 5 principles.
