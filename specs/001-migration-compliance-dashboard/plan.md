# Implementation Plan: MigrationLens Dashboard

**Branch**: `001-migration-compliance-dashboard` | **Date**: 2026-03-12 | **Updated**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-migration-compliance-dashboard/spec.md`

## Summary

Build an AI-powered .NET 10 / C# 14 Modernization Compliance Dashboard that scans Azure DevOps repositories, evaluates compliance against 55 rules across 8 categories using a YAML-driven engine, augments results with Azure OpenAI analysis, and presents everything in a premium branded UI. Backend is Python/FastAPI with two-tier caching; frontend is Next.js 14 with Tailwind CSS (Inmar brand system), Recharts, and Framer Motion.

## Technical Context

**Language/Version**: Python 3.12+ (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI 0.110+, Pydantic v2, pydantic-settings, httpx, PyYAML, structlog, openai (backend); Next.js 14, React 18, Tailwind CSS 3.4+, Recharts 2.x, Framer Motion 11.x, Lucide React, clsx (frontend)
**Storage**: Two-tier cache — in-memory dict (10 min TTL) + JSON files on disk (24h default TTL). No database per Constitution Principle III.
**Testing**: pytest + pytest-asyncio + httpx AsyncClient (backend)
**Target Platform**: Docker containers (standalone Next.js output), cross-platform local dev
**Project Type**: web-service (full-stack dashboard)
**Performance Goals**: Dashboard load < 2s (cached), scan progress polling every 2s, AI analysis < 30s
**Constraints**: No database, file-based persistence only, ADO PAT required, Azure OpenAI endpoint optional (graceful fallback)
**Scale/Scope**: ~100-500 repos per organization, 55 compliance rules, 8 categories, 7 pages (Dashboard, Scan, Reports, PR Review, Settings, Wiki*, Boards*)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | PASS | Full SDD lifecycle followed |
| II. Full-Stack Dashboard | PASS | FastAPI backend + Next.js frontend, 55 rules / 8 categories |
| III. No Database | PASS | Two-tier cache: in-memory + JSON files, no SQL/NoSQL |
| IV. Premium Branded UI | PASS | Inmar brand colors + card layouts + Framer Motion animations |
| V. ADO Integration First | PASS | httpx async client for ADO REST API, PAT auth, repos/wikis/boards/PRs/Git ops |
| VI. AI-Augmented Analysis | PASS | Azure OpenAI for code analysis, risk, migration plan, PR review, auto-fix |

## Project Structure

### Documentation (this feature)

```text
specs/001-migration-compliance-dashboard/
├── plan.md              # This file
├── spec.md              # Feature specification (12 user stories)
├── research.md          # Technical decisions (11 decisions)
├── data-model.md        # Entity definitions & relationships
├── quickstart.md        # Setup & integration test scenarios
├── contracts/
│   └── api-contracts.md # REST API endpoint contracts (17 active + 7 disabled)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app factory, CORS, lifespan, router registration
│   ├── config.py            # Pydantic Settings (ADO, Azure OpenAI, cache, CORS)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py       # ~41 Pydantic v2 models (all entities)
│   │   └── enums.py         # ComplianceStatus, Severity, ExportFormat, Complexity
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ado_client.py    # ADO REST API client (repos, work items, wikis, boards, PRs, Git ops)
│   │   ├── scanner.py       # Repository scanning orchestrator (singleton)
│   │   ├── compliance.py    # YAML rule engine (55 rules, 8 categories, 5 check types)
│   │   ├── cache.py         # Two-tier cache (in-memory + JSON file)
│   │   ├── workitems.py     # ADO work item creation with deduplication
│   │   ├── ai_service.py    # Azure OpenAI integration (analysis, risk, plan, PR review, code fixes)
│   │   ├── autofix.py       # Auto-fix pipeline orchestrator (6 steps, SSE streaming)
│   │   └── wiki_analyzer.py # Wiki page analysis for coding standards extraction
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health.py        # GET /api/health
│   │   ├── dashboard.py     # GET /api/dashboard
│   │   ├── scan.py          # POST /api/scan, POST /api/scan/stop, GET /api/scan/progress
│   │   ├── repos.py         # GET /api/repos, GET /api/repos/{repo_id}
│   │   ├── migration.py     # GET /api/repos/{repo_id}/migration-report
│   │   ├── workitems.py     # POST /api/workitems
│   │   ├── export.py        # GET /api/export
│   │   ├── app_settings.py  # GET /api/settings
│   │   ├── ai.py            # GET /api/repos/{repo_id}/ai-analysis, GET /api/ai/health
│   │   ├── pr_review.py     # GET /api/repos/{repo_id}/pull-requests, review, comment
│   │   ├── autofix.py       # POST /api/autofix/{repo_id} (SSE)
│   │   ├── wiki.py          # GET /api/wiki (DISABLED in main.py)
│   │   └── boards.py        # GET /api/boards (DISABLED in main.py)
│   └── rules/
│       └── compliance-rules.yaml  # 55 rule definitions across 8 categories
├── tests/
│   ├── conftest.py          # Shared fixtures (app, client, sample data)
│   ├── test_api.py          # API endpoint tests (6 tests)
│   ├── test_compliance.py   # Compliance engine tests (5 tests)
│   ├── test_cache.py        # Cache tests (6 tests)
│   └── test_wiki_boards.py  # Wiki & boards tests (8 tests)
├── requirements.txt         # 13 dependencies
├── pyproject.toml           # pytest config
└── Dockerfile

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (Inter font, bg-mesh)
│   │   ├── page.tsx         # Dashboard page (US1, US2, US7)
│   │   ├── globals.css      # Tailwind + brand utilities + bg-mesh + custom scrollbar
│   │   ├── scan/
│   │   │   └── page.tsx     # Standalone scan page (US2)
│   │   ├── repos/
│   │   │   └── [id]/
│   │   │       └── page.tsx # Repo detail page (US3, US4, US5) — 1003 lines
│   │   ├── reports/
│   │   │   └── page.tsx     # Reports page (US12)
│   │   ├── pr-review/
│   │   │   └── page.tsx     # PR Review wizard (US8) — 3-step flow
│   │   ├── settings/
│   │   │   └── page.tsx     # Settings page (US9)
│   │   ├── wiki/
│   │   │   └── page.tsx     # Wiki browser (US10) — DISABLED backend
│   │   └── boards/
│   │       └── page.tsx     # Boards page (US11) — DISABLED backend
│   ├── components/
│   │   ├── ui/
│   │   │   ├── GlassCard.tsx      # Framer Motion card wrapper
│   │   │   ├── ScoreRing.tsx      # SVG circular score indicator
│   │   │   ├── StatusBadge.tsx    # Pass/fail/na pill badge
│   │   │   ├── SeverityBadge.tsx  # Critical/high/medium/low badge
│   │   │   ├── ProgressBar.tsx    # Animated horizontal bar
│   │   │   └── AnimatedCounter.tsx # Number counting animation
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx    # 4 KPI cards with ScoreRing + AnimatedCounter
│   │   │   ├── RepoTable.tsx      # Compliance table with AppTypeBadge, links to detail
│   │   │   └── CategoryOverview.tsx # Category average progress bars
│   │   ├── charts/
│   │   │   ├── ComplianceRadar.tsx # Recharts RadarChart (8 categories)
│   │   │   ├── VersionPieChart.tsx # Recharts PieChart (.NET version donut)
│   │   │   ├── ScoreDistribution.tsx # Recharts BarChart (top 15 repos)
│   │   │   └── index.ts           # Barrel exports
│   │   ├── scan/
│   │   │   ├── ScanButton.tsx     # Gradient scan trigger button
│   │   │   └── ScanProgressPanel.tsx # Progress panel with ProgressBar
│   │   ├── autofix/
│   │   │   └── AutoFixModal.tsx   # 6-step pipeline progress modal
│   │   ├── detail/
│   │   │   └── CategoryBreakdown.tsx # Per-category rule detail (orphaned — not currently used)
│   │   └── layout/
│   │       ├── Header.tsx         # Top bar with title, scan indicator, refresh
│   │       └── Sidebar.tsx        # 5-link nav: Dashboard, Scan, Reports, PR Review, Settings
│   ├── hooks/
│   │   ├── index.ts              # Barrel re-exports (partial — 9 of 14 hooks)
│   │   ├── useDashboard.ts      # Dashboard data fetch
│   │   ├── useRepoList.ts       # ADO repo listing
│   │   ├── useRepoDetail.ts     # Single repo scan result
│   │   ├── useScan.ts           # Scan start/stop/poll
│   │   ├── useMigrationReport.ts # Migration report fetch
│   │   ├── useAIAnalysis.ts     # AI analysis (manual trigger)
│   │   ├── useAutoFix.ts        # SSE auto-fix pipeline
│   │   ├── useWiki.ts           # Wiki list/page/pages
│   │   ├── useBoards.ts         # Board list/detail/work items
│   │   └── useSettings.ts       # App settings fetch
│   └── lib/
│       ├── api.ts               # API client (24 functions + URL builders)
│       └── types.ts             # TypeScript interfaces (~50 types + constants)
├── tailwind.config.ts           # Inmar brand colors, custom animations, glow shadows
├── next.config.js               # standalone output, NEXT_PUBLIC_API_URL
├── package.json                 # Next.js 14, React 18, Recharts, Framer Motion, Lucide
├── tsconfig.json
├── postcss.config.js
└── Dockerfile
```

**Structure Decision**: Web application with separate `backend/` and `frontend/` directories. Backend is a Python/FastAPI REST API. Frontend is a Next.js 14 app with standalone Docker output. API calls use direct URL via `NEXT_PUBLIC_API_URL` (no rewrites/proxy).

## Complexity Tracking

No constitution violations. All design decisions comply with the 6 principles.
