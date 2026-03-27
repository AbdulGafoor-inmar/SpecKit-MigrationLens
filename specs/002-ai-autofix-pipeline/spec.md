# Feature Specification: AI Auto-Fix Pipeline

**Feature Branch**: `002-ai-autofix-pipeline`
**Created**: 2026-03-23
**Updated**: 2026-03-27
**Status**: Implemented
**Input**: User description: "When we create a story using MigrationLens, give an option to work with AI — AI implements all missing standards, immediately creates a PR, and reviews that PR using our AI PR reviewer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Click AI Auto-Fix Pipeline (Priority: P1)

An engineer views a repository's compliance report and sees failing rules. Instead of manually fixing each issue, they click "AI Auto-Fix" to trigger an automated 6-step pipeline. The system: (1) creates an ADO work item (User Story) for the migration — with deduplication, (2) uses Azure OpenAI to generate code fixes for every failing rule by reading current file contents and producing corrected versions, (3) creates a feature branch (`feature/migrationlens-autofix-{date}`) from the default branch, (4) pushes all AI-generated changes as a single commit, (5) creates a Pull Request linked to the story, and (6) automatically runs the AI PR Reviewer on the new PR and posts the review as a comment. The user sees real-time step-by-step progress via Server-Sent Events (SSE).

**Why this priority**: This is the core value — transforming passive compliance reporting into active automated remediation. Without this, MigrationLens only identifies problems; with this, it solves them.

**Independent Test**: Can be tested by navigating to a repo detail page with failing rules, clicking "AI Auto-Fix", observing 6 steps complete in sequence, and verifying that a work item, branch, PR, and review comment all appear in Azure DevOps.

**Acceptance Scenarios**:

1. **Given** a repo with failing compliance rules, **When** the user clicks "AI Auto-Fix", **Then** the pipeline starts and creates (or reuses) an ADO User Story work item.
2. **Given** Step 1 completes, **When** failing rules are analyzed, **Then** Azure OpenAI generates code fixes for each affected file — grouping rules by file for better context.
3. **Given** code fixes are generated, **When** the pipeline continues, **Then** a feature branch `feature/migrationlens-autofix-{date}` is created from the default branch ref.
4. **Given** changes are generated, **When** the pipeline continues, **Then** all fixes are pushed as a single commit to the feature branch.
5. **Given** changes are pushed, **When** the pipeline continues, **Then** a Pull Request is created targeting the default branch, linked to the story, with a description of all fixes applied.
6. **Given** the PR is created, **When** the pipeline continues, **Then** the AI PR Reviewer reviews the PR and posts structured feedback as a PR comment thread.
7. **Given** the pipeline is running, **When** the user watches the UI, **Then** real-time step progress is shown via SSE in a full-screen modal overlay.

---

### User Story 2 - View Auto-Fix Results (Priority: P2)

After the pipeline completes, the user sees a summary in the AutoFixModal showing: the ADO story URL (clickable), the PR URL (clickable), the number of files changed, and the AI PR review verdict with confidence score. Both links open directly in Azure DevOps.

**Why this priority**: Users need clear, actionable output from the pipeline — links to review and approve the AI's work.

**Independent Test**: Can be tested by completing an auto-fix run and verifying that all links are valid, the story exists in ADO, the PR exists with correct file changes, and the review comment is posted.

**Acceptance Scenarios**:

1. **Given** the pipeline completes, **When** the user views the modal, **Then** they see clickable links for the ADO story and PR.
2. **Given** results are shown, **When** the user clicks "View PR", **Then** the PR opens in Azure DevOps showing all AI-generated file changes.
3. **Given** results are shown, **When** the user sees the review verdict, **Then** it displays the verdict (APPROVE/NEEDS_CHANGES/BLOCK) and confidence score.

---

### User Story 3 - Error Handling & Partial Progress (Priority: P3)

If any step in the pipeline fails (e.g., AI can't generate fixes, PR creation fails, insufficient PAT permissions), the pipeline reports the failure for that step and continues where possible. The user sees which steps succeeded and which failed, with error details for failed steps. The modal can be dismissed and the pipeline state can be reset.

**Why this priority**: Robustness — the pipeline should gracefully handle failures without losing progress on successful steps.

**Independent Test**: Can be tested by simulating a failure and verifying the UI shows partial results with clear error messages.

**Acceptance Scenarios**:

1. **Given** a step fails, **When** the user views progress, **Then** the failed step shows error status with a descriptive message.
2. **Given** the pipeline has failed steps, **When** the user views the modal, **Then** completed steps show green checkmarks and failed steps show red X indicators.
3. **Given** the pipeline finishes (with or without errors), **When** the user clicks dismiss, **Then** the modal closes and the state can be reset.

---

### Edge Cases

- What happens when a repo has 0 failing rules? → The "AI Auto-Fix" button is disabled (checked via `failingRulesCount`).
- What happens when the PAT doesn't have push permissions? → The pipeline fails at Step 3/4 with a permissions error.
- What happens when the target branch (main) doesn't exist? → ADO API returns error at branch creation step.
- What happens when AI generates invalid code? → Code is still pushed — it's a PR, not direct to main. The PR review catches issues.
- What happens when the pipeline is already running for a repo? → The button is disabled while `running` is true.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a feature branch from the repo's default branch using ADO Git REST API.
- **FR-002**: System MUST use Azure OpenAI to generate corrected file content for each file affected by failing compliance rules.
- **FR-003**: System MUST push all fixes in a single commit to the feature branch using ADO push API.
- **FR-004**: System MUST create a Pull Request targeting the default branch with a descriptive title and body listing all fixes.
- **FR-005**: System MUST link the PR to the created ADO work item.
- **FR-006**: System MUST automatically trigger AI PR Review on the created PR and post results as a PR comment.
- **FR-007**: System MUST stream real-time step progress to the frontend via SSE (Server-Sent Events).
- **FR-008**: System MUST handle step failures gracefully — report error and continue where possible.
- **FR-009**: System MUST deduplicate work items — reuse existing MigrationLens work item if one exists for the repo.
- **FR-010**: System MUST fetch current file contents from ADO (including common files like .csproj, Dockerfile) to provide context for AI code generation.

### Key Entities

- **AutoFixRequest**: failing_rules (optional rule IDs), organization, project
- **AutoFixStepStatus**: step number (1-6), name, status (pending/running/completed/failed), details, url, data
- **AutoFixResult**: repo_id, repo_name, story_id/url, branch_name, pr_id/url, files_changed, review_verdict/score, steps array, status, error

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can trigger auto-fix and see a working PR in ADO within 60 seconds.
- **SC-002**: AI-generated code is applied for common compliance fixes (csproj updates, Dockerfile changes, config changes).
- **SC-003**: The PR review is automatically posted as a comment within 30 seconds of PR creation.
- **SC-004**: 100% of pipeline steps show real-time progress in the modal UI via SSE.
- **SC-005**: Failed steps display clear error messages without blocking other steps.
