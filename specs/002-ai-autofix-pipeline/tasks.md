# Tasks: AI Auto-Fix Pipeline

**Input**: Design documents from `/specs/002-ai-autofix-pipeline/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Backend — ADO Git Operations

**Purpose**: Add Git API methods to ado_client.py for branch/push/PR creation

- [x] T001 [US1] Add `get_default_branch_ref()` method to `backend/app/services/ado_client.py`
- [x] T002 [US1] Add `create_branch()` method to `backend/app/services/ado_client.py`
- [x] T003 [US1] Add `push_changes()` method to `backend/app/services/ado_client.py`
- [x] T004 [US1] Add `create_pull_request()` method to `backend/app/services/ado_client.py`

---

## Phase 2: Backend — AI Code Fix Generation

**Purpose**: Add AI method to generate code fixes for failing compliance rules

- [x] T005 [US1] Add `generate_code_fixes()` to `backend/app/services/ai_service.py`

---

## Phase 3: Backend — Schemas & Models

**Purpose**: Add Pydantic models for AutoFix request/response/steps

- [x] T006 [P] [US1] Add AutoFix schemas to `backend/app/models/schemas.py`

---

## Phase 4: Backend — Pipeline Orchestrator

**Purpose**: Create the AutoFixPipeline service that coordinates all 6 steps

- [x] T007 [US1] Create `backend/app/services/autofix.py` with `AutoFixPipeline` class

**Checkpoint**: Pipeline orchestrator complete — can be tested via API

---

## Phase 5: Backend — SSE API Endpoint

**Purpose**: Create the FastAPI endpoint that triggers the pipeline and streams progress

- [x] T008 [US1] Create `backend/app/api/autofix.py` with SSE streaming endpoint
- [x] T009 [US1] Register autofix router in `backend/app/main.py`

**Checkpoint**: Backend fully functional — can trigger auto-fix via curl/Postman

---

## Phase 6: Frontend — Types & API Layer

**Purpose**: Add TypeScript types and API function for auto-fix

- [x] T010 [P] [US1] Add AutoFix types to `frontend/src/lib/types.ts`
- [x] T011 [P] [US1] Add `startAutoFix()` API function to `frontend/src/lib/api.ts`

---

## Phase 7: Frontend — Hook & Component

**Purpose**: Create the SSE hook and pipeline progress modal

- [x] T012 [US1] Create `frontend/src/hooks/useAutoFix.ts` with SSE connection
- [x] T013 [US1][US2] Create `frontend/src/components/autofix/AutoFixModal.tsx` with step progress UI

---

## Phase 8: Frontend — Integration

**Purpose**: Wire the auto-fix button into the repo detail page

- [x] T014 [US1][US2] Add "AI Auto-Fix" button to `frontend/src/app/repos/[id]/page.tsx`

**Checkpoint**: Full end-to-end flow working in browser

---

## Dependencies & Execution Order

- **Phase 1** → Phase 4 (pipeline needs ADO git methods)
- **Phase 2** → Phase 4 (pipeline needs AI fix generation)
- **Phase 3** → Phase 4, Phase 5 (schemas needed for pipeline + API)
- **Phase 1, 2, 3** can run in **parallel**
- **Phase 4** → Phase 5 (API needs pipeline service)
- **Phase 6** → Phase 7, 8 (frontend needs types)
- **Phase 7** → Phase 8 (modal needed before page integration)
