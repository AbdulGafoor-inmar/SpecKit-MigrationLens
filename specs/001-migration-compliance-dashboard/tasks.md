# Tasks: MigrationLens Dashboard

**Input**: Design documents from `/specs/001-migration-compliance-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and configuration files

- [ ] T001 Create root project files: `docker-compose.yml`, `.gitignore`, `.env.example`, `README.md`
- [ ] T002 [P] Initialize backend Python project: `backend/requirements.txt`, `backend/Dockerfile`, `backend/.env.example`
- [ ] T003 [P] Initialize frontend Next.js project: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/next.config.js`, `frontend/tailwind.config.ts`, `frontend/postcss.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models, config, services, and UI primitives that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create backend config module in `backend/app/config.py` (Pydantic Settings: ADO_PAT, ADO_ORGANIZATION, ADO_PROJECT, CACHE_DIR, CACHE_TTL)
- [ ] T005 [P] Create enums module in `backend/app/models/enums.py` (ComplianceStatus, Severity enums)
- [ ] T006 [P] Create Pydantic v2 schemas in `backend/app/models/schemas.py` (RepositoryInfo, ComplianceResult, CategoryScore, RepoScanResult, DashboardSummary, ScanProgress, CreateStoryRequest, CreateStoryResponse, ScanRequest, HealthResponse, ExportFormat)
- [ ] T007 Create FastAPI app entrypoint in `backend/app/main.py` (app factory, CORS middleware, lifespan, router includes)
- [ ] T008 [P] Create `backend/app/__init__.py`, `backend/app/models/__init__.py`, `backend/app/services/__init__.py`, `backend/app/api/__init__.py` package files
- [ ] T009 [P] Create compliance rules YAML in `backend/app/rules/compliance-rules.yaml` (30+ rules across 7 categories: SDK & Runtime, Language Features, Project Configuration, NuGet & Dependencies, Code Patterns, DevOps & CI/CD, Performance & AOT)
- [ ] T010 [P] Create ADO client service in `backend/app/services/ado_client.py` (httpx async client, list repos, get file content, get repo metadata)
- [ ] T011 [P] Create JSON file cache service in `backend/app/services/cache.py` (save/load DashboardSummary to JSON, TTL-based expiry, cache invalidation)
- [ ] T012 Create compliance rule engine in `backend/app/services/compliance.py` (load YAML rules, evaluate repo against rules, compute category scores, compute overall score)
- [ ] T013 [P] Create health endpoint in `backend/app/api/health.py` (GET /api/health)
- [ ] T014 [P] Create TypeScript type definitions in `frontend/src/lib/types.ts` (mirror all backend schemas)
- [ ] T015 [P] Create API client module in `frontend/src/lib/api.ts` (fetch wrapper, error handling, base URL config)
- [ ] T016 [P] Create global CSS in `frontend/src/app/globals.css` (Tailwind directives, glassmorphism utilities, dark theme variables, custom scrollbar, animations)
- [ ] T017 Create root layout in `frontend/src/app/layout.tsx` (dark theme, Inter font, metadata, global providers)
- [ ] T018 [P] Create GlassCard component in `frontend/src/components/ui/GlassCard.tsx` (glassmorphism card with backdrop blur, border gradient)
- [ ] T019 [P] Create StatusBadge component in `frontend/src/components/ui/StatusBadge.tsx` (pass/fail/na indicator with color coding)
- [ ] T020 [P] Create ScoreRing component in `frontend/src/components/ui/ScoreRing.tsx` (circular SVG progress ring with animated score, color-coded: green >80, yellow >60, red <=60)
- [ ] T021 [P] Create ProgressBar component in `frontend/src/components/ui/ProgressBar.tsx` (animated horizontal progress bar with percentage label)
- [ ] T022 [P] Create AnimatedCounter component in `frontend/src/components/ui/AnimatedCounter.tsx` (number counting animation using Framer Motion)
- [ ] T023 [P] Create Header component in `frontend/src/components/layout/Header.tsx` (app title, logo, navigation)
- [ ] T024 [P] Create Sidebar component in `frontend/src/components/layout/Sidebar.tsx` (navigation links with Lucide icons, active state)

**Checkpoint**: Foundation ready — all models, services infrastructure, UI primitives, and configuration in place

---

## Phase 3: User Story 1 — View Organization-Wide Dashboard (Priority: P1) 🎯 MVP

**Goal**: Engineering managers see a single-page overview of compliance across all .NET repositories

**Independent Test**: Load `/` → see summary cards (total repos, avg score, compliant count, migration-needed count), repo table, version distribution

### Backend — US1

- [ ] T025 [US1] Create dashboard endpoint in `backend/app/api/dashboard.py` (GET /api/dashboard with organization query param, load from cache, return DashboardSummary)

### Frontend — US1

- [ ] T026 [US1] Create SummaryCards component in `frontend/src/components/dashboard/SummaryCards.tsx` (4 metric cards: total repos, avg score, fully compliant, needs migration — each with AnimatedCounter and icon)
- [ ] T027 [US1] Create RepoTable component in `frontend/src/components/dashboard/RepoTable.tsx` (sortable table with repo name, project, .NET version, compliance score with ScoreRing, status badge, link to detail page)
- [ ] T028 [US1] Create VersionDistribution component in `frontend/src/components/dashboard/VersionDistribution.tsx` (bar chart or grouped badges showing .NET version breakdown)
- [ ] T029 [US1] Create useDashboard hook in `frontend/src/hooks/useDashboard.ts` (fetch dashboard data, loading/error states, auto-refresh)
- [ ] T030 [US1] Create dashboard page in `frontend/src/app/page.tsx` (compose SummaryCards, RepoTable, VersionDistribution with Framer Motion staggered entrance animations)

**Checkpoint**: Dashboard page displays organization-wide compliance metrics from cached data

---

## Phase 4: User Story 2 — Scan Repositories (Priority: P2)

**Goal**: Users trigger a compliance scan that processes all repos and shows real-time progress

**Independent Test**: Click "Scan" → progress bar advances → dashboard populates with scan results

### Backend — US2

- [ ] T031 [US2] Create scanner orchestrator in `backend/app/services/scanner.py` (async scan_all_repos: fetch repo list from ADO, iterate repos, get .csproj files, evaluate compliance rules, aggregate results, update progress state, save to cache)
- [ ] T032 [US2] Create scan endpoints in `backend/app/api/scan.py` (POST /api/scan — start background scan with 409 if already scanning; GET /api/scan/progress — return ScanProgress)

### Frontend — US2

- [ ] T033 [US2] Create ScanButton component in `frontend/src/components/scan/ScanButton.tsx` (animated button with loading state, organization input, trigger POST /api/scan)
- [ ] T034 [US2] Create ScanProgress component in `frontend/src/components/scan/ScanProgress.tsx` (real-time progress bar with current repo name, percentage, animated transitions)
- [ ] T035 [US2] Create useScanProgress hook in `frontend/src/hooks/useScanProgress.ts` (poll GET /api/scan/progress every 2s while scanning, auto-stop on completion, trigger dashboard refresh)
- [ ] T036 [US2] Integrate scan controls into dashboard page `frontend/src/app/page.tsx` (add ScanButton and ScanProgress to header area)

**Checkpoint**: Scan flow works end-to-end — trigger scan, see progress, dashboard auto-refreshes with results

---

## Phase 5: User Story 3 — Detailed Repo Compliance (Priority: P3)

**Goal**: Users drill into a specific repository to see all compliance rule results grouped by category

**Independent Test**: Click repo row → navigate to `/repos/[id]` → see per-category breakdown with pass/fail/na for each rule

### Backend — US3

- [ ] T037 [US3] Create repos endpoint in `backend/app/api/repos.py` (GET /api/repos/{repo_id} — look up RepoScanResult from cached data, return 404 if not found)

### Frontend — US3

- [ ] T038 [US3] Create CategoryBreakdown component in `frontend/src/components/dashboard/CategoryBreakdown.tsx` (expandable sections for each of 7 categories, showing category score, individual rule results with StatusBadge, severity indicator, details/remediation text)
- [ ] T039 [US3] Create useRepoDetail hook in `frontend/src/hooks/useRepoDetail.ts` (fetch single repo scan result by ID, loading/error states)
- [ ] T040 [US3] Create repo detail page in `frontend/src/app/repos/[id]/page.tsx` (repo header with ScoreRing, metadata, CategoryBreakdown, back-to-dashboard link, Framer Motion page transitions)

**Checkpoint**: Repo detail page shows complete compliance breakdown by category with all individual rules

---

## Phase 6: User Story 4 — Create Migration Work Items (Priority: P4)

**Goal**: Users create ADO User Story work items for repositories that need migration

**Independent Test**: On repo detail page, click "Create Work Item" → ADO work item created → success toast with link

### Backend — US4

- [ ] T041 [US4] Create work items service in `backend/app/services/workitems.py` (create ADO work item via REST API: title, description with failing rules, acceptance criteria, priority, tags)
- [ ] T042 [US4] Create work items endpoint in `backend/app/api/workitems.py` (POST /api/workitems — validate request, call workitems service, return CreateStoryResponse with 201)

### Frontend — US4

- [ ] T043 [US4] Add "Create Work Item" button to repo detail page `frontend/src/app/repos/[id]/page.tsx` (button with priority selector, sends failing rules, shows success/error toast with work item link)

**Checkpoint**: Work item creation flows from repo detail page to ADO — user gets clickable link to created work item

---

## Phase 7: User Story 5 — Export Reports (Priority: P5)

**Goal**: Users export compliance data as JSON or CSV files for stakeholder reporting

**Independent Test**: Click "Export" on dashboard → download JSON or CSV file with all scan results

### Backend — US5

- [ ] T044 [US5] Create export endpoint in `backend/app/api/export.py` (GET /api/export with organization and format query params — generate JSON or CSV StreamingResponse with Content-Disposition header)

### Frontend — US5

- [ ] T045 [US5] Add export buttons to dashboard page `frontend/src/app/page.tsx` (JSON and CSV download buttons in header area, trigger file download via /api/export)

**Checkpoint**: Export downloads work for both JSON and CSV formats

---

## Phase 8: User Story 6 — Visualize Analytics (Priority: P6)

**Goal**: Users see interactive charts showing compliance trends and category breakdowns

**Independent Test**: Dashboard shows radar chart, pie chart, and score distribution — all responsive and animated

### Frontend — US6

- [ ] T046 [P] [US6] Create ComplianceRadar component in `frontend/src/components/charts/ComplianceRadar.tsx` (Recharts RadarChart showing 7 category scores for selected repo or org average)
- [ ] T047 [P] [US6] Create VersionPieChart component in `frontend/src/components/charts/VersionPieChart.tsx` (Recharts PieChart with .NET version distribution, custom dark-themed tooltip)
- [ ] T048 [P] [US6] Create ScoreTrend component in `frontend/src/components/charts/ScoreTrend.tsx` (Recharts AreaChart showing score distribution across repos, gradient fill)
- [ ] T049 [US6] Integrate charts into dashboard page `frontend/src/app/page.tsx` (add chart section below summary cards with responsive grid layout, Framer Motion reveal animations)

**Checkpoint**: Dashboard displays interactive, animated charts with compliance analytics

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Testing, documentation, containerization, and final validation

- [ ] T050 [P] Create backend tests in `backend/tests/conftest.py` (test fixtures, mock ADO client, mock cache)
- [ ] T051 [P] Create compliance engine tests in `backend/tests/test_compliance.py` (test rule evaluation, category scoring, overall scoring)
- [ ] T052 [P] Create scanner tests in `backend/tests/test_scanner.py` (test scan orchestration with mocked ADO responses)
- [ ] T053 [P] Create API endpoint tests in `backend/tests/test_api.py` (test all endpoints with TestClient, mock services)
- [ ] T054 [P] Create cache tests in `backend/tests/test_cache.py` (test save/load, TTL expiry, cache invalidation)
- [ ] T055 Finalize `docker-compose.yml` (backend + frontend services with health checks, env vars, volumes)
- [ ] T056 [P] Finalize `README.md` with project overview, architecture diagram, setup instructions, screenshots placeholder, tech stack
- [ ] T057 Run quickstart.md validation — verify all 12 integration test scenarios pass
- [ ] T058 Git add, commit all changes on branch `001-migration-compliance-dashboard`

---

## Phase 10: User Story 7 — Wiki Browser (Priority: P7)

**Goal**: Engineers browse Azure DevOps wiki pages within the dashboard

**Independent Test**: Navigate to `/wiki` → see wiki list → select wiki → browse page tree → view page content

### Backend — US7

- [x] T059 [US7] Add wiki methods to ADO client in `backend/app/services/ado_client.py` (list_wikis, get_wiki_page, list_wiki_pages using ADO Wiki REST API v7.1)
- [x] T060 [US7] Create Wiki Pydantic schemas in `backend/app/models/schemas.py` (WikiInfo, WikiPage with self-referential sub_pages, WikiPageListResponse)
- [x] T061 [US7] Create wiki API router in `backend/app/api/wiki.py` (GET /api/wiki — list wikis; GET /api/wiki/{wiki_id}/page — get page content; GET /api/wiki/{wiki_id}/pages — list page tree)
- [x] T062 [US7] Register wiki router in `backend/app/main.py`

### Frontend — US7

- [x] T063 [P] [US7] Add WikiInfo, WikiPage, WikiPageListResponse TypeScript interfaces in `frontend/src/lib/types.ts`
- [x] T064 [P] [US7] Add listWikis, getWikiPage, listWikiPages functions in `frontend/src/lib/api.ts`
- [x] T065 [US7] Create wiki hooks in `frontend/src/hooks/useWiki.ts` (useWikiList, useWikiPage, useWikiPages — fetch on mount, loading/error states, refresh)
- [x] T066 [US7] Create wiki browser page in `frontend/src/app/wiki/page.tsx` (wiki selector buttons, 2-column layout: recursive PageTree component + Markdown content viewer, glassmorphism styling)
- [x] T067 [US7] Add Wiki navigation link (BookOpen icon) to `frontend/src/components/layout/Sidebar.tsx`

### Tests — US7

- [x] T068 [US7] Create wiki endpoint tests in `backend/tests/test_wiki_boards.py` (test_list_wikis, test_get_wiki_page, test_list_wiki_pages, test_list_wikis_ado_error — 4 tests with mocked ADO client)

**Checkpoint**: Wiki browser page displays wikis, page tree, and page content from ADO

---

## Phase 11: User Story 8 — Boards & Work Items (Priority: P8)

**Goal**: Managers view ADO boards, work items in kanban/list view, and execute WIQL queries

**Independent Test**: Navigate to `/boards` → see board list → select board → view kanban columns with work items → toggle to list view → filter by type/state

### Backend — US8

- [x] T069 [US8] Add board methods to ADO client in `backend/app/services/ado_client.py` (list_boards, get_board_columns, list_work_items_on_board with board-to-type mapping)
- [x] T070 [US8] Add WIQL query methods to ADO client in `backend/app/services/ado_client.py` (query_work_items with WIQL POST, _get_work_items_by_ids batch fetch, get_work_item single fetch)
- [x] T071 [US8] Create Board & WorkItem Pydantic schemas in `backend/app/models/schemas.py` (WorkItemInfo, WorkItemQueryRequest, WorkItemQueryResponse, BoardInfo, BoardColumn, BoardDetailResponse)
- [x] T072 [US8] Create boards API router in `backend/app/api/boards.py` (GET /api/boards — list boards; GET /api/boards/{board_name} — board detail with columns & work items; POST /api/boards/query — custom WIQL; GET /api/boards/workitems/list — filtered work items)
- [x] T073 [US8] Register boards router in `backend/app/main.py`

### Frontend — US8

- [x] T074 [P] [US8] Add WorkItemInfo, WorkItemQueryResponse, BoardInfo, BoardColumn, BoardDetailResponse TypeScript interfaces in `frontend/src/lib/types.ts`
- [x] T075 [P] [US8] Add listBoards, getBoardDetail, listWorkItems functions in `frontend/src/lib/api.ts`
- [x] T076 [US8] Create boards hooks in `frontend/src/hooks/useBoards.ts` (useBoardList, useBoardDetail, useWorkItems — fetch on mount with params, loading/error states, refresh)
- [x] T077 [US8] Create boards page in `frontend/src/app/boards/page.tsx` (board selector buttons, view toggle List/Board, kanban columns with WorkItemCard, list table with WorkItemRow, state color coding, priority labels, glassmorphism styling)
- [x] T078 [US8] Add Boards navigation link (Columns icon) to `frontend/src/components/layout/Sidebar.tsx`

### Tests — US8

- [x] T079 [US8] Create boards endpoint tests in `backend/tests/test_wiki_boards.py` (test_list_boards, test_get_board_detail, test_query_work_items, test_list_work_items, test_list_boards_ado_error, test_query_with_invalid_project, test_get_board_detail_with_team — 7 tests with mocked ADO client)

**Checkpoint**: Boards page displays kanban and list views with work items from ADO, WIQL queries work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phases 3-8 (User Stories 1-6)**: All depend on Phase 2 completion
  - US1 (P1) → US2 (P2) → US3 (P3) → US4 (P4) → US5 (P5) → US6 (P6) in priority order
  - US3 depends on US1 (navigation from dashboard to detail)
  - US4 depends on US3 (work item button on detail page)
  - US5 depends on US2 (needs scan data to export)
  - US6 depends on US1 (charts on dashboard page)
- **Phase 9 (Polish)**: Depends on all user story phases complete
- **Phase 10 (Wiki — US7)**: Depends on Phase 2 (foundational ADO client, schemas, frontend infrastructure)
  - Independent of Phases 3-8 (no dependency on scan/compliance features)
  - Adds wiki methods to existing ADO client, new schemas, new router, new frontend page
- **Phase 11 (Boards — US8)**: Depends on Phase 2 (foundational ADO client, schemas, frontend infrastructure)
  - Independent of Phases 3-8 (no dependency on scan/compliance features)
  - Adds board/work item methods to existing ADO client, new schemas, new router, new frontend page
  - Shares WorkItemInfo schema with US4 (work item creation) conceptually but is independently implemented

### Within Each User Story

- Backend endpoints before frontend integration
- Models/services before API endpoints
- Hooks before page components
- Core implementation before integration

### Parallel Opportunities

- All Phase 2 tasks marked [P] can run in parallel (models, services, UI components are independent files)
- US6 chart components (T046-T048) can all be built in parallel
- All Phase 9 test files (T050-T054) can be written in parallel
