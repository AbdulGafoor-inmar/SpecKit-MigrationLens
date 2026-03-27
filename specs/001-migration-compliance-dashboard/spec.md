# Feature Specification: MigrationLens — .NET 10 / C# 14 Modernization Compliance Dashboard

**Feature Branch**: `001-migration-compliance-dashboard`
**Created**: 2026-03-12
**Updated**: 2026-03-27
**Status**: Implemented
**Input**: User description: "AI-powered .NET 10 / C# 14 Modernization Compliance Dashboard that scans Azure DevOps repositories, evaluates compliance against best practices using a YAML rule-based engine with Azure OpenAI augmentation, visualizes results in a premium branded dashboard, and creates ADO work items for migration gaps"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Organization-Wide Compliance Dashboard (Priority: P1)

An engineering manager opens MigrationLens and immediately sees a high-level summary of all repositories in their Azure DevOps organization. The dashboard shows average compliance score, total repositories scanned, count of passing repos, and count of failing repos. Each repository is listed in a sortable table with its name, app type, .NET version, compliance score, status, and complexity. The manager can filter repos and quickly identify which repos are lagging behind on .NET 10 / C# 14 adoption.

**Why this priority**: This is the core value proposition — giving leadership instant visibility into modernization progress across their entire organization. Without this, no other features matter.

**Independent Test**: Can be fully tested by loading the dashboard page, verifying summary cards display aggregate metrics, and confirming the repo table shows repository data with compliance scores.

**Acceptance Scenarios**:

1. **Given** a user has configured ADO credentials, **When** they open the dashboard, **Then** they see 4 summary cards (Avg Score, Repositories, Passing, Failing) with accurate aggregate data.
2. **Given** the dashboard is loaded with repository data, **When** the user views the repo table, **Then** repos are displayed with name, app type (api/worker/cronjob/library), .NET version, compliance score (0-100), status badge, and complexity.
3. **Given** the repo table is visible, **When** the user clicks a repository row, **Then** they navigate to the detailed repo compliance page at `/repos/{id}`.
4. **Given** the dashboard is loaded, **When** the user views category averages, **Then** progress bars show average scores across all 8 compliance categories sorted by score.

---

### User Story 2 - Scan Repositories for Compliance (Priority: P2)

An engineering manager navigates to the scan page or uses the dashboard scan controls to trigger a scan of repositories in their ADO organization. They can select specific repos from a checkbox list or scan all. The system connects to Azure DevOps, retrieves repository lists, analyzes each repository's project files (.csproj, .cs, Dockerfile, deployment.yaml, etc.) against 55 compliance rules organized into 8 categories. A real-time progress panel shows scan status. Results are cached using a two-tier cache (in-memory + JSON files).

**Why this priority**: The scan engine is the data source for everything — without scanning, there's no compliance data to display.

**Independent Test**: Can be tested by triggering a scan, verifying progress updates appear, confirming results are cached to disk, and validating that compliance scores are computed correctly per category.

**Acceptance Scenarios**:

1. **Given** valid ADO credentials are configured, **When** the user clicks "Start Scan" with selected repos, **Then** the system begins scanning and displays a progress panel with current repo name and percentage.
2. **Given** a scan is in progress, **When** a repository is analyzed, **Then** it is evaluated against all 8 compliance categories with individual category scores.
3. **Given** a scan completes, **When** results are ready, **Then** they are cached in-memory and as JSON files on disk with configurable TTL (default 24 hours).
4. **Given** a scan is in progress, **When** the user clicks "Stop Scan", **Then** the scan is cancelled and partial results are preserved.
5. **Given** a scan is already in progress, **When** the user triggers another scan, **Then** a 409 error is returned preventing duplicate scans.

---

### User Story 3 - View Detailed Repository Compliance & Migration Report (Priority: P3)

An engineer clicks on a specific repository in the dashboard table to see its detailed compliance and migration report. The detail view shows: an animated circular score ring with the overall compliance percentage, .NET version detected, app type, severity summary cards (critical/high/medium/low counts), category-by-category progress bars, wiki standards checklist, and a full step-by-step migration guide with expandable rule details including current code, suggested fix, and migration guide. The user can filter steps by severity and category, and expand/collapse all steps.

**Why this priority**: After seeing the overview, users need to drill into specific repos to understand exactly what needs to change. This drives actionable remediation.

**Independent Test**: Can be tested by navigating to a repo detail page, verifying the score ring, severity cards, category progress bars, and migration step cards all render correctly.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they click a repository row, **Then** they navigate to a detail page showing that repo's full migration report.
2. **Given** the detail page is loaded, **When** the user views the score ring, **Then** it shows an animated circular progress indicator with the percentage.
3. **Given** the detail page is loaded, **When** the user views severity cards, **Then** 4 cards show counts for critical, high, medium, and low severity issues.
4. **Given** the detail page is loaded, **When** the user views migration steps, **Then** steps are expandable cards showing rule details, current code, suggested fix, and migration guide.
5. **Given** the detail page is loaded, **When** the user applies category/severity filters, **Then** only matching migration steps are shown.

---

### User Story 4 - AI-Powered Code Analysis & Risk Assessment (Priority: P4)

From the repo detail page, an engineer clicks "Run AI Analysis" to get deep AI-powered insights. Azure OpenAI analyzes the repo's compliance results and generates: code analysis with insights and recommendations, risk assessment with effort estimation and risk factors, and a phased migration plan with tasks, PR suggestions, and breaking changes. Results are displayed in a tabbed panel (Code Insights, Risk Assessment, Migration Plan).

**Why this priority**: AI analysis provides deeper, contextual insights beyond what static rules can detect — helping engineers understand the effort and risk involved in migration.

**Independent Test**: Can be tested by clicking "Run AI Analysis" on a repo detail page and verifying all three analysis tabs populate with structured data.

**Acceptance Scenarios**:

1. **Given** the user is on a repo detail page, **When** they click "Run AI Analysis", **Then** the AI analysis panel loads with a summary, insights, and recommendations.
2. **Given** AI analysis completes, **When** the user views the Risk Assessment tab, **Then** they see risk level, risk score, effort estimate in days, risk factors, and mitigation suggestions.
3. **Given** AI analysis completes, **When** the user views the Migration Plan tab, **Then** they see ordered phases with tasks, estimated hours, PR suggestions, and breaking changes.
4. **Given** Azure OpenAI is unavailable, **When** the user triggers AI analysis, **Then** the system falls back to rule-based analysis with appropriate messaging.

---

### User Story 5 - Create Migration Work Items (Priority: P5)

An engineering manager identifies a repository with compliance gaps and creates an Azure DevOps work item (User Story) to track the migration work. From the repo detail page, they click "Create Story". The system checks for existing MigrationLens work items (deduplication), then creates a well-formatted ADO User Story containing the repo name, current compliance score, failing rules in an HTML table, and acceptance criteria. A toast notification confirms successful creation.

**Why this priority**: Closing the loop from discovery to action — teams need trackable work items without manual copy-paste.

**Independent Test**: Can be tested by clicking "Create Story" for a repo, verifying the ADO API is called with correct payload, and confirming a success notification appears.

**Acceptance Scenarios**:

1. **Given** the user views a repo with compliance gaps, **When** they click "Create Story", **Then** an ADO User Story is created with the repo name, score, and gap details.
2. **Given** a MigrationLens work item already exists for the repo, **When** the user clicks "Create Story", **Then** the existing work item is returned (deduplication).
3. **Given** the ADO API is unreachable, **When** the user clicks "Create Story", **Then** an error message appears with details.

---

### User Story 6 - Export Compliance Reports (Priority: P6)

A manager exports the full compliance dashboard data as a JSON or CSV file for reporting, auditing, or sharing with stakeholders. The export includes all repository scan results with scores, categories, and individual rule results.

**Why this priority**: Enterprise environments need exportable data for compliance audits and executive reporting.

**Independent Test**: Can be tested by clicking "Export" and verifying a file downloads with complete dashboard data.

**Acceptance Scenarios**:

1. **Given** the dashboard has loaded data, **When** the user clicks "Export JSON" or "Export CSV", **Then** a file downloads containing all scan results.
2. **Given** no data is loaded, **When** the user clicks "Export", **Then** a 404 error indicates no data to export.

---

### User Story 7 - Visualize Compliance Analytics (Priority: P7)

The dashboard includes analytics charts: a compliance radar chart showing category averages, a donut chart showing .NET version distribution across the organization, and a horizontal bar chart showing repos sorted by compliance score.

**Why this priority**: Analytics provide strategic insights beyond individual repo scores — helping leadership prioritize migration efforts.

**Independent Test**: Can be tested by loading the dashboard with data and verifying all three chart components render.

**Acceptance Scenarios**:

1. **Given** repos have been scanned, **When** the dashboard loads, **Then** a radar chart displays average scores for all 8 compliance categories.
2. **Given** repos have been scanned, **When** the dashboard loads, **Then** a donut chart shows .NET version distribution.
3. **Given** repos have been scanned, **When** the dashboard loads, **Then** a horizontal bar chart shows the top 15 repos by score.

---

### User Story 8 - AI PR Review (Priority: P8)

An engineer navigates to the PR Review page to get AI-powered review of pull requests. They select a repository, then a pull request (filterable by status: active/completed/all). The AI reviews the PR diff against linked work items, acceptance criteria, and coding standards using a 7-dimension scoring model (Story Alignment 20pts, AC 25pts, Code Quality 15pts, Business Logic 15pts, Implementation Quality 10pts, Completeness 10pts, Risk & Security 5pts). Results include a verdict (APPROVE/NEEDS_CHANGES/BLOCK), confidence score, issues list, and suggestions. The review can be posted as a PR comment.

**Why this priority**: Automated PR review ensures migration PRs meet quality standards before merging.

**Independent Test**: Can be tested by navigating to `/pr-review`, selecting a repo and PR, running the review, and verifying structured results appear.

**Acceptance Scenarios**:

1. **Given** the user is on the PR Review page, **When** they select a repository, **Then** they see a list of pull requests filterable by status.
2. **Given** a PR is selected, **When** the AI review runs, **Then** they see a verdict, confidence score, dimensional breakdown, and categorized issues.
3. **Given** a review is complete, **When** the user clicks "Post to PR", **Then** the review is posted as a comment thread on the ADO pull request.

---

### User Story 9 - View Application Settings (Priority: P9)

An engineer navigates to the Settings page to view the current application configuration: Azure DevOps connection details (organization, project, PAT status), server settings (backend URL, CORS origins), and cache settings (directory, TTL). Settings are read-only and displayed in organized cards.

**Why this priority**: Users need visibility into the application's configuration for troubleshooting and verification.

**Independent Test**: Can be tested by navigating to `/settings` and verifying config cards display correct values.

**Acceptance Scenarios**:

1. **Given** the user navigates to Settings, **When** the page loads, **Then** they see Azure DevOps, Server, Cache, and Configuration cards with current values.
2. **Given** the user views Settings, **When** they check the PAT status, **Then** they see whether a PAT is configured (without revealing the token).

---

### User Story 10 - Browse Wiki Pages (Priority: P10)

An engineer navigates to the Wiki section to browse project wiki documentation from Azure DevOps. They see a list of available wikis, select one, and explore the page tree hierarchy. Selecting a page displays its content.

**Why this priority**: Wiki integration provides context for migration decisions — engineers can view architecture docs and coding standards directly in the dashboard.

**Note**: Wiki and Boards routers are currently **disabled** in the backend (`main.py`). The frontend pages and backend code exist but the routes are commented out.

**Acceptance Scenarios**:

1. **Given** wiki routes are enabled, **When** they navigate to the Wiki page, **Then** they see a list of available wikis.
2. **Given** wikis are listed, **When** the user selects a wiki, **Then** a hierarchical page tree is displayed.
3. **Given** the page tree is visible, **When** the user clicks a page, **Then** the page content is displayed in a content viewer panel.

---

### User Story 11 - View Boards & Work Items (Priority: P11)

An engineering manager navigates to the Boards section to view Azure DevOps boards and work items. They see a list of boards, select one to view work items in a kanban board view or a sortable list view.

**Why this priority**: Boards integration lets managers track migration work items alongside compliance data.

**Note**: Wiki and Boards routers are currently **disabled** in the backend (`main.py`). The frontend pages and backend code exist but the routes are commented out.

**Acceptance Scenarios**:

1. **Given** board routes are enabled, **When** the user selects a board, **Then** work items are displayed in a kanban board view with column lanes.
2. **Given** work items are displayed, **When** the user toggles to list view, **Then** work items are shown in a table with ID, Title, Type, State, Priority, Assigned To, Tags, and Updated columns.

---

### User Story 12 - Dedicated Reports Page (Priority: P12)

A manager navigates to the Reports page for a focused compliance reporting view. This page shows 4 summary cards, category compliance overview with horizontal bars, and a detailed repository compliance table with export buttons.

**Why this priority**: A dedicated reports page optimized for review and export, separate from the interactive dashboard.

**Acceptance Scenarios**:

1. **Given** scan data exists, **When** the user navigates to Reports, **Then** they see summary cards, category overview, and a repo compliance table.
2. **Given** the reports page is loaded, **When** the user clicks Export, **Then** a JSON or CSV file downloads.

---

### Edge Cases

- What happens when ADO credentials are invalid or expired? → Show clear error message with guidance to check PAT token.
- What happens when a repository has no .csproj files? → Mark as "Not Applicable" with 0% score and appropriate status.
- What happens when a scan is already in progress and user triggers another? → Return 409 "A scan is already in progress".
- What happens when ADO API rate limits are hit? → Implement retry with exponential backoff, show user-facing warning.
- What happens when a wiki page path does not exist? → Return empty content with graceful handling.
- What happens when a board has no work items? → Display empty columns with placeholder.
- What happens when Azure OpenAI is unavailable? → Fall back to rule-based analysis with `ai_available: false` flag.
- What happens when a work item already exists for a repo? → Deduplicate — return the existing work item instead of creating a duplicate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to Azure DevOps using a Personal Access Token (PAT) configured via environment variable.
- **FR-002**: System MUST retrieve the list of all repositories from a configured ADO organization and project.
- **FR-003**: System MUST analyze each repository against 55 compliance rules across 8 categories: SDK & Runtime, Language Features, Project Configuration, NuGet & Dependencies, Code Patterns, DevOps & CI/CD, AKS & Kubernetes, Performance & AOT.
- **FR-004**: System MUST compute per-category and overall compliance scores as percentages (0-100).
- **FR-005**: System MUST cache scan results using a two-tier cache: in-memory (10 min TTL) + JSON files on disk (configurable TTL, default 24 hours).
- **FR-006**: System MUST display a dashboard with 4 summary metric cards showing aggregate compliance data.
- **FR-007**: System MUST display a sortable table of repositories with name, app type, .NET version, score, status, and complexity.
- **FR-008**: System MUST provide a detail view per repository showing score ring, severity summary, category progress, wiki standards, and step-by-step migration guide.
- **FR-009**: System MUST create Azure DevOps work items (User Stories) containing compliance gap details with deduplication.
- **FR-010**: System MUST export dashboard data as downloadable JSON or CSV files.
- **FR-011**: System MUST show real-time scan progress with repository name and percentage completion.
- **FR-012**: System MUST display analytics charts: compliance radar, version distribution donut, and score distribution bar chart.
- **FR-013**: System MUST use the Inmar brand color system (plum, teal, sunset, goldenrod, frost) with card-based layouts, animated score rings, glow effects, and smooth transitions.
- **FR-014**: System MUST provide AI code analysis, risk assessment, and migration plan generation via Azure OpenAI.
- **FR-015**: System MUST provide AI-powered PR review with 7-dimension scoring and the ability to post review comments to ADO.
- **FR-016**: System MUST support listing and browsing Azure DevOps wiki pages with hierarchical navigation.
- **FR-017**: System MUST support listing and viewing Azure DevOps boards with kanban and list views.
- **FR-018**: System MUST provide a health check endpoint and an AI health check endpoint.
- **FR-019**: System MUST provide a read-only settings page showing current configuration.
- **FR-020**: System MUST support selective repository scanning (user-selected repos via checkboxes).
- **FR-021**: System MUST detect app type (api, worker, cronjob, library) from repository file analysis.
- **FR-022**: System MUST provide a dedicated reports page with summary cards, category overview, and repo table.
- **FR-023**: System MUST support scan cancellation (stop an in-progress scan).
- **FR-024**: System MUST support compliance rule `applies_to` filtering for app-type-specific rules.

### Key Entities

- **RepositoryInfo**: ID, name, URL, default branch, project, .NET version, app type
- **ComplianceResult**: Rule ID, name, category, status (pass/fail/na), severity (critical/high/medium/low), details, file path, line number, current code, suggested fix, migration guide
- **CategoryScore**: Category name, score percentage, total/passed/failed/na rules
- **RepoScanResult**: Repository, compliance results, category scores, overall score, compliance status, .NET/C# versions, complexity, project count
- **DashboardSummary**: Organization, project, total/scanned repos, average score, passing/failing counts, repos, category averages
- **ScanProgress**: Total repos, scanned repos, current repo, progress %, is_scanning, message
- **MigrationReport**: Repository, steps, severity counts, passing/failing rules, overall score, .NET version current/target, wiki standards, categories summary
- **AIAnalysisResponse**: Code analysis, risk assessment, migration plan, ai_available flag
- **PRReviewResult**: PR info, work items, verdict, confidence score, dimensional breakdown, issues, suggestions
- **WikiInfo/WikiPage**: Wiki metadata and page content with recursive sub-pages
- **BoardInfo/BoardColumn/BoardDetailResponse**: Board metadata, columns, work items
- **WorkItemInfo**: ID, title, state, type, assigned to, priority, tags, dates, URL

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view compliance status of all repositories within 3 seconds of page load (cached data).
- **SC-002**: Scanning repositories completes with accurate progress reporting and caching.
- **SC-003**: Compliance scores are calculated deterministically — same input always produces same output.
- **SC-004**: Users can identify the lowest-scoring repository within 10 seconds of opening the dashboard.
- **SC-005**: Creating a migration work item takes no more than 2 clicks from the repo detail page.
- **SC-006**: The dashboard renders correctly on screens 1280px wide and above.
- **SC-007**: All interactive elements provide visual feedback (hover states, loading indicators, notifications).
- **SC-008**: Exported JSON/CSV contains complete data matching what is displayed on the dashboard.
- **SC-009**: AI analysis returns structured insights within 30 seconds of triggering.
- **SC-010**: PR reviews include dimensional confidence breakdown with actionable issues and suggestions.
- **SC-011**: Wiki and Boards pages render data from ADO when their routes are enabled.
- **SC-012**: The system gracefully falls back when Azure OpenAI is unavailable.
