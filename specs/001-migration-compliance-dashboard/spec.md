# Feature Specification: MigrationLens — .NET 10 / C# 14 Modernization Compliance Dashboard

**Feature Branch**: `001-migration-compliance-dashboard`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "AI-powered .NET 10 / C# 14 Modernization Compliance Dashboard that scans Azure DevOps repositories, evaluates compliance against best practices using a rule-based engine, visualizes results in a premium glassmorphism dark dashboard, and creates ADO work items for migration gaps"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Organization-Wide Compliance Dashboard (Priority: P1)

An engineering manager opens MigrationLens and immediately sees a high-level summary of all repositories in their Azure DevOps organization. The dashboard shows total repositories scanned, average compliance score, count of fully compliant repos, and count needing migration. Each repository is listed in a sortable/filterable table with its name, .NET version, compliance score, and status. The manager can quickly identify which repos are lagging behind on .NET 10 / C# 14 adoption.

**Why this priority**: This is the core value proposition — giving leadership instant visibility into modernization progress across their entire organization. Without this, no other features matter.

**Independent Test**: Can be fully tested by loading the dashboard page, verifying summary cards display aggregate metrics, and confirming the repo table shows sorted/filtered repository data with compliance scores.

**Acceptance Scenarios**:

1. **Given** a user has configured ADO credentials, **When** they open the dashboard, **Then** they see 4 summary cards (Total Repos, Avg Compliance %, Fully Compliant count, Needs Migration count) with accurate aggregate data.
2. **Given** the dashboard is loaded with repository data, **When** the user views the repo table, **Then** repos are displayed with name, .NET version, compliance score (0-100), and a color-coded status badge.
3. **Given** the repo table is visible, **When** the user clicks a column header, **Then** the table sorts by that column (ascending/descending toggle).
4. **Given** the repo table is visible, **When** the user types in the search/filter box, **Then** only repos matching the query are shown.

---

### User Story 2 - Scan Repositories for Compliance (Priority: P2)

An engineering manager triggers a scan of all repositories in their ADO organization. The system connects to Azure DevOps, retrieves the list of repositories, analyzes each repository's project files (.csproj, global.json, .editorconfig, Program.cs, etc.) against 40+ compliance rules organized into 7 categories (SDK & Runtime, Language Features, Project Configuration, NuGet & Dependencies, Code Patterns, DevOps & CI/CD, Performance & AOT). A real-time progress bar shows scan status. Results are cached to JSON files to avoid redundant API calls.

**Why this priority**: The scan engine is the data source for everything — without scanning, there's no compliance data to display. This is the engine that powers the entire system.

**Independent Test**: Can be tested by triggering a scan, verifying progress updates appear, confirming results are cached to disk, and validating that compliance scores are computed correctly per category.

**Acceptance Scenarios**:

1. **Given** valid ADO credentials are configured, **When** the user clicks "Scan All Repos", **Then** the system begins scanning and displays a progress bar with current repo name and percentage.
2. **Given** a scan is in progress, **When** a repository is analyzed, **Then** it is evaluated against all 7 compliance categories with individual category scores.
3. **Given** a scan completes, **When** results are ready, **Then** they are cached as JSON files on disk with a configurable TTL.
4. **Given** cached results exist and are within TTL, **When** the user loads the dashboard, **Then** cached results are served without re-scanning.

---

### User Story 3 - View Detailed Repository Compliance (Priority: P3)

An engineer clicks on a specific repository in the dashboard table to see its detailed compliance report. The detail view shows: an animated circular score ring with the overall compliance percentage, .NET version detected, project complexity metrics, a radar chart showing scores across all 7 compliance categories, and a grouped list of all individual compliance rules with their pass/fail/not-applicable status and severity levels.

**Why this priority**: After seeing the overview, users need to drill into specific repos to understand exactly what needs to change. This drives actionable remediation.

**Independent Test**: Can be tested by navigating to a repo detail page, verifying the score ring animates correctly, radar chart renders all 7 categories, and compliance rules are grouped by category with correct status badges.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they click a repository row, **Then** they navigate to a detail page showing that repo's full compliance report.
2. **Given** the detail page is loaded, **When** the user views the score ring, **Then** it shows an animated circular progress indicator with the percentage and a letter grade (A/B/C/D/F).
3. **Given** the detail page is loaded, **When** the user views the radar chart, **Then** it displays scores for all 7 compliance categories on a radar/spider chart.
4. **Given** the detail page is loaded, **When** the user views compliance rules, **Then** rules are grouped by category and each shows status (pass/fail/na) and severity (critical/high/medium/low).

---

### User Story 4 - Create Migration Work Items (Priority: P4)

An engineering manager identifies a repository with compliance gaps and wants to create an Azure DevOps work item (User Story) to track the migration work. From the repo table, they click a "Create Story" button for a specific repo. The system automatically generates a well-formatted ADO work item containing: the repo name, current compliance score, list of failing compliance rules grouped by category, and recommended remediation steps. A toast notification confirms successful creation with the work item ID.

**Why this priority**: Closing the loop from discovery to action. Once gaps are identified, teams need a frictionless way to create trackable work items without manual copy-paste.

**Independent Test**: Can be tested by clicking "Create Story" for a repo, verifying the ADO API is called with correct payload, and confirming a success toast appears with the created work item ID.

**Acceptance Scenarios**:

1. **Given** the user views a repo with compliance gaps, **When** they click "Create Story", **Then** an ADO work item is created with the repo name, compliance score, and gap details.
2. **Given** a work item is created successfully, **When** the API responds, **Then** a toast notification shows "Story created: #{workItemId}" with a link.
3. **Given** the ADO API is unreachable, **When** the user clicks "Create Story", **Then** an error toast appears with a descriptive message.

---

### User Story 5 - Export Compliance Report (Priority: P5)

A manager exports the full compliance dashboard data as a JSON file for reporting, auditing, or sharing with stakeholders who don't have access to the dashboard. The export includes all repository scan results with scores, categories, and individual rule results.

**Why this priority**: Enterprise environments need exportable data for compliance audits, executive reporting, and integration with other tools.

**Independent Test**: Can be tested by clicking "Export" and verifying a JSON file downloads with complete dashboard data.

**Acceptance Scenarios**:

1. **Given** the dashboard has loaded data, **When** the user clicks "Export JSON", **Then** a JSON file downloads containing all scan results.
2. **Given** no data is loaded, **When** the user clicks "Export", **Then** a helpful message appears indicating no data to export.

---

### User Story 6 - Visualize Compliance Analytics (Priority: P6)

The dashboard includes analytics charts: a horizontal bar chart showing repos sorted by lowest compliance score (highlighting repos most needing attention), a donut/pie chart showing the distribution of .NET versions across the organization, and a top compliance gaps list showing the most common failing rules across all repos with progress bars.

**Why this priority**: Analytics provide strategic insights beyond individual repo scores — helping leadership prioritize migration efforts and track organizational trends.

**Independent Test**: Can be tested by loading the dashboard with data and verifying all three chart components render with correct data.

**Acceptance Scenarios**:

1. **Given** repos have been scanned, **When** the dashboard loads, **Then** a bar chart displays repos sorted by lowest score.
2. **Given** repos have been scanned, **When** the dashboard loads, **Then** a donut chart shows .NET version distribution.
3. **Given** repos have been scanned, **When** the dashboard loads, **Then** a "Top Gaps" section lists the most common failing rules.

---

### Edge Cases

- What happens when ADO credentials are invalid or expired? → Show clear error message with guidance to check PAT token.
- What happens when a repository has no .csproj files? → Mark as "Not Applicable" with 0% score and appropriate status.
- What happens when the cache directory is not writable? → Fall back to in-memory results with a warning log.
- What happens when a scan is already in progress and user triggers another? → Reject with "Scan already in progress" message.
- What happens when ADO API rate limits are hit? → Implement retry with exponential backoff, show user-facing warning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to Azure DevOps using a Personal Access Token (PAT) configured via environment variable.
- **FR-002**: System MUST retrieve the list of all repositories from a configured ADO organization and project.
- **FR-003**: System MUST analyze each repository against 40+ compliance rules across 7 categories: SDK & Runtime, Language Features, Project Configuration, NuGet & Dependencies, Code Patterns, DevOps & CI/CD, Performance & AOT.
- **FR-004**: System MUST compute per-category and overall compliance scores as percentages (0-100).
- **FR-005**: System MUST cache scan results as JSON files on disk with a configurable TTL (default 1 hour).
- **FR-006**: System MUST display a dashboard with 4 summary metric cards showing aggregate compliance data.
- **FR-007**: System MUST display a sortable, filterable table of repositories with name, .NET version, score, and status.
- **FR-008**: System MUST provide a detail view per repository showing score ring, radar chart, and grouped compliance rules.
- **FR-009**: System MUST create Azure DevOps work items (User Stories) containing compliance gap details.
- **FR-010**: System MUST export dashboard data as a downloadable JSON file.
- **FR-011**: System MUST show real-time scan progress with repository name and percentage completion.
- **FR-012**: System MUST display analytics charts: repo score bar chart, version distribution donut, top compliance gaps.
- **FR-013**: System MUST use a dark theme with glassmorphism design, animated score rings, glow effects, and smooth transitions.
- **FR-014**: System MUST proxy frontend API calls to the backend via Next.js rewrites to avoid CORS issues.
- **FR-015**: System MUST provide a health check endpoint for monitoring.

### Key Entities

- **Repository**: Name, URL, default branch, .NET version detected, project files found
- **ComplianceResult**: Rule ID, rule name, category, status (pass/fail/na), severity (critical/high/medium/low), details
- **CategoryScore**: Category name, score percentage, total rules, passed rules, failed rules, na rules
- **RepoScanResult**: Repository info, list of compliance results, list of category scores, overall score, scan timestamp
- **DashboardSummary**: Total repos, average score, fully compliant count, needs migration count, .NET version distribution
- **ScanProgress**: Total repos, completed count, current repo name, percentage, is_scanning flag

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view compliance status of all repositories within 3 seconds of page load (cached data).
- **SC-002**: Scanning 50 repositories completes within 5 minutes with accurate progress reporting.
- **SC-003**: Compliance scores are calculated consistently — same input always produces same output.
- **SC-004**: Users can identify the lowest-scoring repository within 10 seconds of opening the dashboard.
- **SC-005**: Creating a migration work item takes no more than 2 clicks from the repository table.
- **SC-006**: The dashboard renders correctly on screens 1280px wide and above.
- **SC-007**: All interactive elements provide visual feedback (hover states, loading indicators, toast notifications).
- **SC-008**: Exported JSON contains complete data matching what is displayed on the dashboard.
