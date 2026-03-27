# Implementation Plan: AI Auto-Fix Pipeline

**Branch**: `002-ai-autofix-pipeline` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ai-autofix-pipeline/spec.md`

## Summary

Build an end-to-end AI Auto-Fix pipeline that takes a repository's failing compliance rules, generates code fixes via Azure OpenAI, pushes them to ADO as a branch + PR + linked story, and auto-reviews the PR — all triggered by a single button click with real-time progress streaming.

## Technical Context

**Language/Version**: Python 3.12+ (backend), TypeScript strict (frontend)
**Primary Dependencies**: FastAPI, httpx, openai, Pydantic v2 (backend); Next.js 14, React 18, Tailwind CSS (frontend)
**Storage**: In-memory cache with JSON file persistence (no database per constitution)
**Target Platform**: Local development (Windows), future Docker deployment
**Project Type**: Web application (full-stack)
**Constraints**: Azure OpenAI token limits (~4096 tokens per call), ADO API rate limits, PAT permissions for push/PR creation

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development | ✅ | This document + spec.md + tasks.md |
| II. Full-Stack Compliance Dashboard | ✅ | Auto-fix directly serves the migration goal |
| III. No Database | ✅ | Results cached in memory/JSON files |
| IV. Premium Dark UI | ✅ | Pipeline modal uses glassmorphism + animations |
| V. Azure DevOps Integration First | ✅ | All git ops use ADO REST APIs |

## Architecture

### Pipeline Flow

```
POST /api/autofix/{repo_id}  →  SSE stream
  │
  ├─ Step 1: Create ADO Work Item (User Story)
  │   └─ Reuse: WorkItemService.create_migration_story()
  │
  ├─ Step 2: AI Code Generation
  │   └─ NEW: ai_service.generate_code_fixes()
  │   └─ For each failing rule → read current file → GPT fix → return patched content
  │
  ├─ Step 3: Create Feature Branch
  │   └─ NEW: ADOClient.create_branch()
  │   └─ ADO API: POST /{project}/_apis/git/repositories/{repo}/refs
  │
  ├─ Step 4: Push Commit
  │   └─ NEW: ADOClient.push_changes()
  │   └─ ADO API: POST /{project}/_apis/git/repositories/{repo}/pushes
  │
  ├─ Step 5: Create Pull Request
  │   └─ NEW: ADOClient.create_pull_request()
  │   └─ ADO API: POST /{project}/_apis/git/repositories/{repo}/pullrequests
  │
  └─ Step 6: AI PR Review
      └─ Reuse: ai_service.review_pull_request() + ADOClient.post_pr_comment()
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Streaming | SSE (EventSource) | Real-time step updates; simpler than WebSocket |
| Commit strategy | Single commit, all fixes | Clean git history, one commit = one auto-fix run |
| Branch naming | `feature/migrationlens-autofix-{date}` | Identifiable, avoids conflicts |
| AI per-rule vs batch | Group by file, batch rules | Better context, fewer API calls |
| Error handling | Continue on partial failure | Non-critical file failures shouldn't block the pipeline |

## Project Structure

### Backend Changes

```text
backend/app/
├── api/
│   └── autofix.py           # NEW — POST /api/autofix/{repo_id} (SSE endpoint)
├── services/
│   ├── ado_client.py         # MODIFY — Add: get_default_branch_ref, create_branch, push_changes, create_pull_request
│   ├── ai_service.py         # MODIFY — Add: generate_code_fixes()
│   └── autofix.py            # NEW — AutoFixPipeline orchestrator
├── models/
│   └── schemas.py            # MODIFY — Add: AutoFixRequest, AutoFixStep, AutoFixResult
└── main.py                   # MODIFY — Register autofix router
```

### Frontend Changes

```text
frontend/src/
├── lib/
│   ├── types.ts              # MODIFY — Add: AutoFix types
│   └── api.ts                # MODIFY — Add: startAutoFix API
├── hooks/
│   └── useAutoFix.ts         # NEW — SSE-based pipeline hook
├── components/
│   └── autofix/
│       └── AutoFixModal.tsx  # NEW — Pipeline progress modal
└── app/
    └── repos/[id]/
        └── page.tsx          # MODIFY — Add "AI Auto-Fix" button
```

## Complexity Tracking

No constitution violations.
