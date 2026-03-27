# Tasks: AI Auto-Fix Pipeline

**Input**: Design documents from `/specs/002-ai-autofix-pipeline/`
**Prerequisites**: plan.md ✅, spec.md ✅
**Updated**: 2026-03-27

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Backend — ADO Git Operations

**Purpose**: Add Git API methods to ado_client.py for branch/push/PR creation

- [x] T001 [US1] Add `get_default_branch_ref()` to `backend/app/services/ado_client.py` — returns branch name + latest commit SHA
- [x] T002 [US1] Add `create_branch()` to `backend/app/services/ado_client.py` — creates branch via ADO refs API
- [x] T003 [US1] Add `push_changes()` to `backend/app/services/ado_client.py` — pushes file changes as a single commit via ADO pushes API
- [x] T004 [US1] Add `create_pull_request()` to `backend/app/services/ado_client.py` — creates PR with work item link via ADO pullrequests API

---

## Phase 2: Backend — AI Code Fix Generation

**Purpose**: Add AI method to generate corrected file content for failing compliance rules

- [x] T005 [US1] Add `generate_code_fixes()` to `backend/app/services/ai_service.py` — takes repo name, failing rules, and current file contents; returns dict of file_path → corrected_content via Azure OpenAI

---

## Phase 3: Backend — Schemas & Models

**Purpose**: Add Pydantic models for AutoFix request/response/steps

- [x] T006 [P] [US1] Add AutoFix schemas to `backend/app/models/schemas.py`: `AutoFixRequest` (failing_rules, organization, project), `AutoFixStepStatus` (step, name, status, details, url, data), `AutoFixResult` (repo_id, story/PR details, steps, files_changed, review verdict)

---

## Phase 4: Backend — Pipeline Orchestrator

**Purpose**: Create the AutoFixPipeline service that coordinates all 6 steps as an async generator

- [x] T007 [US1][US3] Create `backend/app/services/autofix.py` with `AutoFixPipeline` class (~475 lines):
  - `run()` async generator yielding `AutoFixStepStatus` for SSE streaming
  - Step 1: Create work item via `WorkItemService` (with dedup)
  - Step 2: Generate AI fixes via `ai_service.generate_code_fixes()`
  - Step 3: Create feature branch via `ADOClient.create_branch()`
  - Step 4: Push commit via `ADOClient.push_changes()`
  - Step 5: Create PR via `ADOClient.create_pull_request()`
  - Step 6: AI PR review via `ai_service.review_pull_request()` + `ADOClient.post_pr_comment()`
  - Helper: `_get_repo_from_cache()`, `_get_failing_rules()`, `_fetch_files_for_rules()`

**Checkpoint**: Pipeline orchestrator complete — can be tested via API

---

## Phase 5: Backend — SSE API Endpoint

**Purpose**: Create the FastAPI endpoint that triggers the pipeline and streams progress

- [x] T008 [US1] Create `backend/app/api/autofix.py` with SSE streaming endpoint (POST /api/autofix/{repo_id}) — accepts `AutoFixRequest` body, returns `EventSourceResponse` with JSON events
- [x] T009 [US1] Register autofix router in `backend/app/main.py` under `/api` prefix with "Auto-Fix" tag

**Checkpoint**: Backend fully functional — can trigger auto-fix via curl/Postman, receive SSE stream

---

## Phase 6: Frontend — Types & API Layer

**Purpose**: Add TypeScript types and API function for auto-fix

- [x] T010 [P] [US1] Add AutoFix types to `frontend/src/lib/types.ts`: `AutoFixStepStatus` type alias, `AutoFixStep` interface (step, name, status, details, url, data), `AutoFixRequest`, `AutoFixResult`
- [x] T011 [P] [US1] Add `getAutoFixStreamUrl(repoId)` URL builder to `frontend/src/lib/api.ts` — returns SSE endpoint URL

---

## Phase 7: Frontend — Hook & Component

**Purpose**: Create the SSE hook and pipeline progress modal

- [x] T012 [US1][US3] Create `frontend/src/hooks/useAutoFix.ts`:
  - Manages 6-step state array with status tracking
  - SSE connection via `fetch()` with ReadableStream (not EventSource — supports POST body)
  - Parses JSON events, updates step statuses
  - Exports: `steps`, `running`, `done`, `error`, `storyUrl`, `prUrl`, `prId`, `storyId`, `reviewVerdict`, `reviewScore`, `filesChanged`, `startAutoFix()`, `cancel()`, `reset()`

- [x] T013 [US1][US2] Create `frontend/src/components/autofix/AutoFixModal.tsx`:
  - Full-screen modal overlay with backdrop blur
  - 6-step progress display with icons: Bug, Sparkles, GitBranch, FileCode, GitPullRequest, Shield
  - Step status indicators: pending (gray), running (animated pulse), completed (green check), failed (red X)
  - Progress bar showing overall completion
  - Error display with message
  - Result section: Story link, PR link, review verdict badge, files changed count
  - Cancel button during execution, Close button after completion

---

## Phase 8: Frontend — Integration

**Purpose**: Wire the auto-fix button into the repo detail page

- [x] T014 [US1][US2] Add "AI Auto-Fix" button to `frontend/src/app/repos/[id]/page.tsx`:
  - Button with Sparkles icon, disabled when running or 0 failing rules
  - Triggers `startAutoFix()` from `useAutoFix` hook
  - Opens `AutoFixModal` overlay with all pipeline state props

**Checkpoint**: Full end-to-end flow working in browser

---

## Dependencies & Execution Order

```
Phase 1 (ADO Git) ──┐
Phase 2 (AI Fixes) ──┼──→ Phase 4 (Pipeline) ──→ Phase 5 (SSE API) ──→ Phase 8 (Integration)
Phase 3 (Schemas) ──┘                                                     ↑
                                                                           │
Phase 6 (Types) ──→ Phase 7 (Hook + Modal) ───────────────────────────────┘
```

- **Phases 1, 2, 3** can run in **parallel** (different files, no dependencies)
- **Phase 4** depends on 1, 2, 3 (pipeline needs ADO git methods, AI fixes, and schemas)
- **Phase 5** depends on 4 (API endpoint wraps pipeline)
- **Phase 6** can run in **parallel** with backend phases (different codebase)
- **Phase 7** depends on 6 (needs TypeScript types)
- **Phase 8** depends on 5 + 7 (needs both backend API and frontend modal)
