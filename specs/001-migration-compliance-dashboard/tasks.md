# Tasks: MigrationLens Dashboard

**Input**: Design documents from `/specs/001-migration-compliance-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅
**Updated**: 2026-03-27

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and configuration files

- [x] T001 Create root project files: `docker-compose.yml`, `.gitignore`, `README.md`
- [x] T002 [P] Initialize backend Python project: `backend/requirements.txt` (13 deps), `backend/Dockerfile`, `backend/pyproject.toml`
- [x] T003 [P] Initialize frontend Next.js project: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/next.config.js`, `frontend/tailwind.config.ts`, `frontend/postcss.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models, config, services, and UI primitives that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create backend config module in `backend/app/config.py` (Pydantic Settings: ADO_PAT, ADO_ORGANIZATION, ADO_PROJECT, AZURE_OPENAI_*, CACHE_DIR, CACHE_TTL, BACKEND_URL, CORS_ORIGINS)
- [x] T005 [P] Create enums module in `backend/app/models/enums.py` (ComplianceStatus, Severity, ExportFormat, Complexity)
- [x] T006 [P] Create Pydantic v2 schemas in `backend/app/models/schemas.py` (~41 models: core domain, scan, wiki, work items, migration report, AI analysis, PR review, auto-fix)
- [x] T007 Create FastAPI app factory in `backend/app/main.py` (CORS middleware, structlog, lifespan, 11 active routers under /api prefix)
- [x] T008 [P] Create package `__init__.py` files for `backend/app/`, `models/`, `services/`, `api/`
- [x] T009 [P] Create compliance rules YAML in `backend/app/rules/compliance-rules.yaml` (55 rules across 8 categories with 5 check types)
- [x] T010 [P] Create ADO client service in `backend/app/services/ado_client.py` (httpx async client: repos, work items, wikis, boards, PRs, Git ops — ~773 lines)
- [x] T011 [P] Create two-tier cache service in `backend/app/services/cache.py` (in-memory dict with 10min TTL + JSON file with configurable TTL)
- [x] T012 Create compliance rule engine in `backend/app/services/compliance.py` (load YAML, evaluate 5 check types, compute category/overall scores, app_type filtering)
- [x] T013 [P] Create health endpoint in `backend/app/api/health.py` (GET /api/health)
- [x] T014 [P] Create TypeScript type definitions in `frontend/src/lib/types.ts` (~50 interfaces + type aliases + constants)
- [x] T015 [P] Create API client module in `frontend/src/lib/api.ts` (fetch wrapper with ApiError class, 24 functions + URL builders)
- [x] T016 [P] Create global CSS in `frontend/src/app/globals.css` (Tailwind directives, Inmar brand CSS vars, brand-card, bg-mesh, gradient-text, custom scrollbar)
- [x] T017 Create root layout in `frontend/src/app/layout.tsx` (Inter font, bg-mesh, metadata)
- [x] T018 [P] Create GlassCard component in `frontend/src/components/ui/GlassCard.tsx` (Framer Motion card with brand-card class, fade+slide-up)
- [x] T019 [P] Create StatusBadge component in `frontend/src/components/ui/StatusBadge.tsx` (pass/fail/na pill badge)
- [x] T020 [P] Create SeverityBadge component in `frontend/src/components/ui/SeverityBadge.tsx` (critical/high/medium/low badge)
- [x] T021 [P] Create ScoreRing component in `frontend/src/components/ui/ScoreRing.tsx` (SVG circular progress with gradient stroke, color-coded)
- [x] T022 [P] Create ProgressBar component in `frontend/src/components/ui/ProgressBar.tsx` (Framer Motion animated horizontal bar)
- [x] T023 [P] Create AnimatedCounter component in `frontend/src/components/ui/AnimatedCounter.tsx` (requestAnimationFrame counter with ease-out)
- [x] T024 [P] Create Header component in `frontend/src/components/layout/Header.tsx` (top bar with title, scan indicator, refresh button)
- [x] T025 [P] Create Sidebar component in `frontend/src/components/layout/Sidebar.tsx` (5-link nav: Dashboard, Scan, Reports, PR Review, Settings — collapsible at <lg)

**Checkpoint**: Foundation ready — all models, services infrastructure, UI primitives, and configuration in place

---

## Phase 3: User Story 1 — View Organization-Wide Dashboard (Priority: P1) 🎯 MVP

**Goal**: Engineering managers see a single-page overview of compliance across all repositories

**Independent Test**: Load `/` → see summary cards, repo table, category overview

### Backend — US1

- [x] T026 [US1] Create dashboard endpoint in `backend/app/api/dashboard.py` (GET /api/dashboard, load from cache)

### Frontend — US1

- [x] T027 [US1] Create SummaryCards component in `frontend/src/components/dashboard/SummaryCards.tsx` (4 metric cards with ScoreRing + AnimatedCounter: Avg Score, Repositories, Passing, Failing)
- [x] T028 [US1] Create RepoTable component in `frontend/src/components/dashboard/RepoTable.tsx` (table with AppTypeBadge, ScoreRing, StatusBadge, complexity, links to /repos/{id})
- [x] T029 [US1] Create CategoryOverview component in `frontend/src/components/dashboard/CategoryOverview.tsx` (ProgressBar per category average, sorted descending)
- [x] T030 [US1] Create useDashboard hook in `frontend/src/hooks/useDashboard.ts` (fetch dashboard data, loading/error states, refresh)
- [x] T031 [US1] Create dashboard page in `frontend/src/app/page.tsx` (compose SummaryCards, RepoTable, CategoryOverview, charts, scan controls, repo selection)

**Checkpoint**: Dashboard page displays organization-wide compliance metrics from cached data

---

## Phase 4: User Story 2 — Scan Repositories (Priority: P2)

**Goal**: Users trigger a compliance scan that processes selected/all repos and shows real-time progress

**Independent Test**: Click "Start Scan" → progress panel advances → dashboard populates with results

### Backend — US2

- [x] T032 [US2] Create scanner orchestrator in `backend/app/services/scanner.py` (singleton, async scan_all_repos, _scan_single_repo, _detect_app_type, _build_summary — ~377 lines)
- [x] T033 [US2] Create scan endpoints in `backend/app/api/scan.py` (POST /api/scan with background task + 409, POST /api/scan/stop, GET /api/scan/progress)
- [x] T034 [US2] Create repos endpoints in `backend/app/api/repos.py` (GET /api/repos — list from ADO with in-memory cache, GET /api/repos/{repo_id} — detail from scan data)

### Frontend — US2

- [x] T035 [US2] Create ScanButton component in `frontend/src/components/scan/ScanButton.tsx` (gradient button with disabled state)
- [x] T036 [US2] Create ScanProgressPanel component in `frontend/src/components/scan/ScanProgressPanel.tsx` (GlassCard with ProgressBar, current repo name)
- [x] T037 [US2] Create useRepoList hook in `frontend/src/hooks/useRepoList.ts` (list ADO repos for selection)
- [x] T038 [US2] Create useScan hook in `frontend/src/hooks/useScan.ts` (poll every 2s, auto-detect in-progress, start/stop)
- [x] T039 [US2] Integrate scan controls + repo selection into dashboard page `frontend/src/app/page.tsx`
- [x] T040 [US2] Create standalone scan page in `frontend/src/app/scan/page.tsx` (start/stop, progress, how-it-works panel)

**Checkpoint**: Scan flow works end-to-end — trigger scan, see progress, dashboard auto-refreshes

---

## Phase 5: User Story 3 — Detailed Repo Compliance & Migration Report (Priority: P3)

**Goal**: Users drill into a specific repository to see all compliance details and step-by-step migration guide

**Independent Test**: Click repo row → navigate to `/repos/{id}` → see score ring, severity cards, category progress, migration steps

### Backend — US3

- [x] T041 [US3] Create wiki analyzer service in `backend/app/services/wiki_analyzer.py` (fetch wiki pages, extract coding standards — ~320 lines)
- [x] T042 [US3] Create migration report endpoint in `backend/app/api/migration.py` (GET /api/repos/{repo_id}/migration-report — build MigrationReport from scan data + wiki standards)

### Frontend — US3

- [x] T043 [US3] Create CategoryBreakdown component in `frontend/src/components/detail/CategoryBreakdown.tsx` (expandable category sections with individual rules — note: exists but currently orphaned)
- [x] T044 [US3] Create useMigrationReport hook in `frontend/src/hooks/useMigrationReport.ts` (fetch migration report, loading/error)
- [x] T045 [US3] Create repo detail page in `frontend/src/app/repos/[id]/page.tsx` (score ring, severity summary, category progress, wiki standards, expandable MigrationStepCard with filters — ~1003 lines)

**Checkpoint**: Repo detail page shows complete compliance breakdown with step-by-step migration guide

---

## Phase 6: User Story 4 — AI-Powered Code Analysis (Priority: P4)

**Goal**: Users get deep AI insights: code analysis, risk assessment, and migration plan

**Independent Test**: On repo detail, click "Run AI Analysis" → see 3-tab panel with structured results

### Backend — US4

- [x] T046 [US4] Create AI service in `backend/app/services/ai_service.py` (AsyncAzureOpenAI client, analyze_code, summarize_wiki_page, generate_migration_plan, assess_risk, check_ai_health — ~882 lines, with fallback)
- [x] T047 [US4] Create AI endpoints in `backend/app/api/ai.py` (GET /api/repos/{repo_id}/ai-analysis — parallel analysis, GET /api/ai/health)

### Frontend — US4

- [x] T048 [US4] Create useAIAnalysis hook in `frontend/src/hooks/useAIAnalysis.ts` (manual trigger, loading/error states)
- [x] T049 [US4] Add AI Analysis Panel to repo detail page `frontend/src/app/repos/[id]/page.tsx` (inline component with 3 tabs: Code Insights, Risk Assessment, Migration Plan)

**Checkpoint**: AI analysis panel shows structured insights, risk factors, and phased migration plan

---

## Phase 7: User Story 5 — Create Migration Work Items (Priority: P5)

**Goal**: Users create ADO User Story work items for repositories with compliance gaps

**Independent Test**: Click "Create Story" → ADO work item created → success notification

### Backend — US5

- [x] T050 [US5] Create work items service in `backend/app/services/workitems.py` (dedup check via find_migration_work_item, create with HTML description — ~160 lines)
- [x] T051 [US5] Create work items endpoint in `backend/app/api/workitems.py` (POST /api/workitems — validate, create, return 201)

### Frontend — US5

- [x] T052 [US5] Add "Create Story" button to repo detail page `frontend/src/app/repos/[id]/page.tsx` (button with toast notification)

**Checkpoint**: Work item creation flows from repo detail page to ADO with deduplication

---

## Phase 8: User Story 6 — Export Reports (Priority: P6)

**Goal**: Users export compliance data as JSON or CSV files

**Independent Test**: Click "Export" → download file with all scan results

### Backend — US6

- [x] T053 [US6] Create export endpoint in `backend/app/api/export.py` (GET /api/export with format query param — StreamingResponse with Content-Disposition)

### Frontend — US6

- [x] T054 [US6] Add export buttons to dashboard page `frontend/src/app/page.tsx` (JSON and CSV download via getExportUrl)

**Checkpoint**: Export downloads work for JSON and CSV formats

---

## Phase 9: User Story 7 — Visualize Analytics (Priority: P7)

**Goal**: Users see interactive charts showing compliance trends and category breakdowns

**Independent Test**: Dashboard shows radar chart, pie chart, and score distribution bar chart

### Frontend — US7

- [x] T055 [P] [US7] Create ComplianceRadar component in `frontend/src/components/charts/ComplianceRadar.tsx` (Recharts RadarChart, 8 categories, plum colored)
- [x] T056 [P] [US7] Create VersionPieChart component in `frontend/src/components/charts/VersionPieChart.tsx` (Recharts PieChart donut, .NET version distribution)
- [x] T057 [P] [US7] Create ScoreDistribution component in `frontend/src/components/charts/ScoreDistribution.tsx` (Recharts BarChart, horizontal, top 15 repos, color-coded)
- [x] T058 [US7] Create charts barrel export in `frontend/src/components/charts/index.ts`
- [x] T059 [US7] Integrate charts into dashboard page `frontend/src/app/page.tsx`

**Checkpoint**: Dashboard displays interactive, animated charts with compliance analytics

---

## Phase 10: User Story 8 — AI PR Review (Priority: P8)

**Goal**: Users select a repo and PR, run AI review with 7-dimension scoring, and post results to ADO

**Independent Test**: Navigate to `/pr-review` → select repo → select PR → see verdict + dimensional breakdown → post to PR

### Backend — US8

- [x] T060 [US8] Add PR review method to AI service in `backend/app/services/ai_service.py` (review_pull_request with 7-dimension scoring model)
- [x] T061 [US8] Create PR review endpoints in `backend/app/api/pr_review.py` (GET /api/repos/{repo_id}/pull-requests, GET .../review, POST .../comment)

### Frontend — US8

- [x] T062 [US8] Create PR Review page in `frontend/src/app/pr-review/page.tsx` (3-step wizard: select repo → select PR → review results — ~878 lines)

**Checkpoint**: PR Review page shows verdict, confidence breakdown, issues, and can post to ADO

---

## Phase 11: User Story 9 — View Application Settings (Priority: P9)

**Goal**: Users view current application configuration in read-only cards

**Independent Test**: Navigate to `/settings` → see ADO, Server, Cache config cards

### Backend — US9

- [x] T063 [US9] Create settings endpoint in `backend/app/api/app_settings.py` (GET /api/settings — return non-sensitive config)

### Frontend — US9

- [x] T064 [US9] Create useSettings hook in `frontend/src/hooks/useSettings.ts` (fetch settings, loading/error)
- [x] T065 [US9] Create settings page in `frontend/src/app/settings/page.tsx` (4 cards: Azure DevOps, Server, Cache, Configuration)

**Checkpoint**: Settings page displays current configuration

---

## Phase 12: User Story 10 — Wiki Browser (Priority: P10)

**Goal**: Engineers browse Azure DevOps wiki pages within the dashboard

**Note**: Wiki router is currently **disabled** in `backend/app/main.py` (commented out)

### Backend — US10

- [x] T066 [US10] Add wiki methods to ADO client in `backend/app/services/ado_client.py` (list_wikis, get_wiki_page, list_wiki_pages, _flatten_wiki_pages)
- [x] T067 [US10] Create wiki API router in `backend/app/api/wiki.py` (GET /api/wiki, GET .../page, GET .../pages — DISABLED in main.py)

### Frontend — US10

- [x] T068 [US10] Create wiki hooks in `frontend/src/hooks/useWiki.ts` (useWikiList, useWikiPage, useWikiPages)
- [x] T069 [US10] Create wiki browser page in `frontend/src/app/wiki/page.tsx` (wiki selector, recursive PageTree, content viewer)

**Note**: Wiki page not added to Sidebar navigation

**Checkpoint**: Wiki browser page exists but routes are disabled in backend

---

## Phase 13: User Story 11 — Boards & Work Items (Priority: P11)

**Goal**: Managers view ADO boards, work items in kanban/list view

**Note**: Boards router is currently **disabled** in `backend/app/main.py` (commented out)

### Backend — US11

- [x] T070 [US11] Add board methods to ADO client in `backend/app/services/ado_client.py` (list_boards, get_board_columns, list_work_items_on_board)
- [x] T071 [US11] Add WIQL query methods to ADO client (query_work_items, _get_work_items_by_ids, get_work_item)
- [x] T072 [US11] Create boards API router in `backend/app/api/boards.py` (GET /api/boards, GET .../{board_name}, POST .../query, GET .../workitems/list — DISABLED in main.py)

### Frontend — US11

- [x] T073 [US11] Create boards hooks in `frontend/src/hooks/useBoards.ts` (useBoardList, useBoardDetail, useWorkItems)
- [x] T074 [US11] Create boards page in `frontend/src/app/boards/page.tsx` (board selector, view toggle List/Board, kanban columns, work item table)

**Note**: Boards page not added to Sidebar navigation

**Checkpoint**: Boards page exists but routes are disabled in backend

---

## Phase 14: User Story 12 — Reports Page (Priority: P12)

**Goal**: Dedicated reports page for compliance review and export

**Independent Test**: Navigate to `/reports` → see summary cards, category bars, repo table, export buttons

### Frontend — US12

- [x] T075 [US12] Create reports page in `frontend/src/app/reports/page.tsx` (summary cards, category compliance overview, repo table, export buttons)

**Checkpoint**: Reports page displays compliance data with export functionality

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Testing, hooks barrel, and validation

- [x] T076 [P] Create backend test fixtures in `backend/tests/conftest.py` (app, AsyncClient, sample data)
- [x] T077 [P] Create API endpoint tests in `backend/tests/test_api.py` (6 tests: health, dashboard, progress, repo, export, workitems)
- [x] T078 [P] Create compliance engine tests in `backend/tests/test_compliance.py` (5 tests: load rules, passing/failing csproj, category scores, overall score)
- [x] T079 [P] Create cache tests in `backend/tests/test_cache.py` (6 tests: save/load, TTL, file creation)
- [x] T080 [P] Create wiki & boards tests in `backend/tests/test_wiki_boards.py` (8 tests with mocked ADO client)
- [x] T081 Create hooks barrel export in `frontend/src/hooks/index.ts` (re-exports 9 of 14 hooks — missing useSettings, useAIAnalysis, useAutoFix, useMigrationReport, useRepoList)

---

## Known Issues

1. **Wiki & Boards disabled**: Routers commented out in `backend/app/main.py`. Frontend pages exist but can't reach the backend.
2. **Wiki/Boards not in Sidebar**: Only 5 nav links (Dashboard, Scan, Reports, PR Review, Settings). Wiki and Boards pages exist at `/wiki` and `/boards` but no navigation.
3. **Hooks barrel incomplete**: `frontend/src/hooks/index.ts` only re-exports 9 of 14 hooks.
4. **CategoryBreakdown orphaned**: Component exists at `frontend/src/components/detail/CategoryBreakdown.tsx` but is not imported by any page.
5. **Duplicate scan logic**: `frontend/src/app/scan/page.tsx` reimplements polling logic instead of using the `useScan` hook.
6. **Test issues**: `test_compliance.py` uses wrong keyword args (`csproj_contents` vs `csproj_files`). `test_cache.py` calls `cache.invalidate()` which doesn't exist on `CacheManager`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phases 3-14 (User Stories 1-12)**: All depend on Phase 2
  - US1 (P1) → US2 (P2): Dashboard needs scan data
  - US3 (P3): Needs US1 (navigation from dashboard)
  - US4 (P4): Needs US3 (AI panel on detail page)
  - US5 (P5): Needs US3 (work item button on detail page)
  - US6 (P6): Needs US2 (data to export)
  - US7 (P7): Needs US1 (charts on dashboard page)
  - US8 (P8): Independent (PR review page)
  - US9 (P9): Independent (settings page)
  - US10 (P10): Independent (wiki page — disabled backend)
  - US11 (P11): Independent (boards page — disabled backend)
  - US12 (P12): Needs US2 (data for reports)
- **Phase 15 (Polish)**: After all story phases
