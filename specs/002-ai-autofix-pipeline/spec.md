# Feature Specification: AI Auto-Fix Pipeline

**Feature Branch**: `002-ai-autofix-pipeline`
**Created**: 2026-03-23
**Status**: Draft
**Input**: User description: "When we create a story using MigrationLens, give an option to work with AI — AI implements all missing standards, immediately creates a PR, and reviews that PR using our AI PR reviewer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Click AI Auto-Fix Pipeline (Priority: P1)

An engineer views a repository's compliance report and sees failing rules. Instead of manually fixing each issue, they click "AI Auto-Fix" to trigger an automated pipeline. The system creates an ADO work item (User Story) for the migration, uses Azure OpenAI to generate code fixes for every failing rule, creates a feature branch, pushes the AI-generated changes as a single commit, creates a Pull Request linked to the story, and automatically runs our AI PR Reviewer on the new PR. The user sees real-time step-by-step progress via Server-Sent Events.

**Why this priority**: This is the core value — transforming passive compliance reporting into active automated remediation. Without this, MigrationLens only identifies problems; with this, it solves them.

**Independent Test**: Can be tested by navigating to a repo detail page with failing rules, clicking "AI Auto-Fix", observing 6 steps complete in sequence, and verifying that a work item, branch, PR, and review comment all appear in Azure DevOps.

**Acceptance Scenarios**:

1. **Given** a repo with failing compliance rules, **When** the user clicks "AI Auto-Fix", **Then** the pipeline starts and creates an ADO User Story work item.
2. **Given** Step 1 completes, **When** failing rules are analyzed, **Then** Azure OpenAI generates code fixes for each affected file.
3. **Given** code fixes are generated, **When** the pipeline continues, **Then** a feature branch is created from main/master and changes are pushed as a single commit.
4. **Given** changes are pushed, **When** the pipeline continues, **Then** a Pull Request is created linking to the story with a description of all fixes applied.
5. **Given** the PR is created, **When** the pipeline continues, **Then** our AI PR Reviewer automatically reviews the PR and posts structured feedback.
6. **Given** the pipeline is running, **When** the user watches the UI, **Then** real-time step progress is shown via SSE (Server-Sent Events).

---

### User Story 2 - View Auto-Fix Results (Priority: P2)

After the pipeline completes, the user sees a summary showing: the ADO story URL, the PR URL (clickable to open in ADO), the number of files changed, and the AI PR review verdict. Both the story and PR links open directly in Azure DevOps.

**Why this priority**: Users need clear, actionable output from the pipeline — links to review and approve the AI's work.

**Independent Test**: Can be tested by completing an auto-fix run and verifying that all links are valid, the story exists in ADO, the PR exists with correct file changes, and the review comment is posted.

**Acceptance Scenarios**:

1. **Given** the pipeline completes, **When** the user views results, **Then** they see clickable links for the ADO story and PR.
2. **Given** results are shown, **When** the user clicks "View PR", **Then** the PR opens in Azure DevOps showing all AI-generated file changes.
3. **Given** results are shown, **When** the user clicks "View Story", **Then** the story opens in ADO with failing rules listed in the description.

---

### User Story 3 - Error Handling & Partial Progress (Priority: P3)

If any step in the pipeline fails (e.g., AI can't generate a fix for one file, or the PR creation fails), the pipeline continues with partial results where possible. The user sees which steps succeeded and which failed, with error details for failed steps.

**Why this priority**: Robustness — the pipeline should gracefully handle failures without losing progress on successful steps.

**Independent Test**: Can be tested by simulating a failure (e.g., invalid PAT, network timeout) and verifying the UI shows partial results with clear error messages.

**Acceptance Scenarios**:

1. **Given** AI cannot fix a specific file, **When** the pipeline continues, **Then** other files are still committed and the failed file is reported in the UI.
2. **Given** a step fails, **When** the user views progress, **Then** the failed step shows an error message and subsequent steps are marked as skipped.

---

### Edge Cases

- What happens when a repo has 0 failing rules? → The "AI Auto-Fix" button is disabled.
- What happens when the PAT doesn't have push permissions? → The pipeline fails at Step 3 with a clear permissions error.
- What happens when the target branch (main) doesn't exist? → The system falls back to master, then fails with an error.
- What happens when AI generates invalid code? → The code is still pushed (it's a PR, not direct to main), and the PR review catches issues.
- What happens when the pipeline is already running for a repo? → The button is disabled to prevent duplicate runs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a feature branch from the repo's default branch
- **FR-002**: System MUST use Azure OpenAI to generate code fixes for each failing compliance rule
- **FR-003**: System MUST push all fixes in a single commit to the feature branch
- **FR-004**: System MUST create a Pull Request targeting the default branch with a descriptive title and body
- **FR-005**: System MUST link the PR to the created ADO work item
- **FR-006**: System MUST automatically trigger AI PR Review on the created PR
- **FR-007**: System MUST stream real-time progress to the frontend via SSE
- **FR-008**: System MUST handle partial failures gracefully (continue with files that succeed)
- **FR-009**: System MUST persist pipeline results in memory cache for retrieval

### Key Entities

- **AutoFixPipeline**: Orchestrator managing the 6-step flow
- **AutoFixStep**: Individual step with name, status (pending/running/completed/failed), and output data
- **AutoFixResult**: Final result containing story URL, PR URL, review result, list of files changed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can trigger auto-fix and see a working PR in ADO within 60 seconds
- **SC-002**: AI-generated code compiles for at least 80% of common compliance fixes (csproj updates, Dockerfile changes, config changes)
- **SC-003**: The PR review is automatically posted as a comment within 30 seconds of PR creation
- **SC-004**: 100% of pipeline steps show real-time progress in the UI
