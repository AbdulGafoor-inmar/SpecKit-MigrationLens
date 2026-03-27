# Implementation Plan: AI Auto-Fix Pipeline

**Branch**: `002-ai-autofix-pipeline` | **Date**: 2026-03-23 | **Updated**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ai-autofix-pipeline/spec.md`

## Summary

Build an end-to-end AI Auto-Fix pipeline that takes a repository's failing compliance rules, generates code fixes via Azure OpenAI, pushes them to ADO as a branch + PR + linked story, and auto-reviews the PR — all triggered by a single button click with real-time progress streaming via SSE.

## Technical Context

**Language/Version**: Python 3.12+ (backend), TypeScript strict (frontend)
**Primary Dependencies**: FastAPI, httpx, openai (AsyncAzureOpenAI), Pydantic v2 (backend); Next.js 14, React 18, Tailwind CSS (frontend)
**Storage**: In-memory state during pipeline execution, cached scan data for repo lookup (no database per constitution)
**Target Platform**: Local development (Windows), Docker deployment
**Project Type**: Web application (full-stack) — extends existing MigrationLens codebase
**Constraints**: Azure OpenAI token limits, ADO API rate limits, PAT must have Code Write permissions for push/PR/branch creation

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development | ✅ | This document + spec.md + tasks.md |
| II. Full-Stack Compliance Dashboard | ✅ | Auto-fix directly serves the migration compliance goal |
| III. No Database | ✅ | Pipeline state in memory, repo data from JSON file cache |
| IV. Premium Branded UI | ✅ | AutoFixModal with step progress, brand colors, Framer Motion |
| V. Azure DevOps Integration First | ✅ | All git ops (branch, push, PR) via ADO REST APIs |
| VI. AI-Augmented Analysis | ✅ | Azure OpenAI generates code fixes + reviews PR |

## Architecture

### Pipeline Flow

```
POST /api/autofix/{repo_id}  →  SSE stream
  │
  ├─ Step 1: Create ADO Work Item (User Story)
  │   └─ WorkItemService.create_migration_story() — with dedup
  │
  ├─ Step 2: AI Code Generation
  │   └─ ai_service.generate_code_fixes()
  │   └─ For each file: read current content → group failing rules → GPT fix → return corrected content
  │   └─ Also fetches common files (.csproj, Dockerfile, etc.) for context
  │
  ├─ Step 3: Create Feature Branch
  │   └─ ADOClient.get_default_branch_ref() → ADOClient.create_branch()
  │   └─ Branch name: feature/migrationlens-autofix-{YYYYMMDD-HHMMSS}
  │
  ├─ Step 4: Push Commit
  │   └─ ADOClient.push_changes()
  │   └─ Single commit with all file changes
  │
  ├─ Step 5: Create Pull Request
  │   └─ ADOClient.create_pull_request()
  │   └─ Linked to work item from Step 1, descriptive title + body
  │
  └─ Step 6: AI PR Review
      └─ ai_service.review_pull_request()
      └─ ADOClient.post_pr_comment() — posts review as PR comment thread
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Streaming | SSE (EventSource) | Real-time step updates; simpler than WebSocket for unidirectional flow |
| Commit strategy | Single commit, all fixes | Clean git history, one commit = one auto-fix run |
| Branch naming | `feature/migrationlens-autofix-{date}` | Identifiable, avoids conflicts with timestamp |
| AI file grouping | Group rules by file, batch to AI | Better context for AI, fewer API calls |
| Error handling | Continue on partial failure | Non-critical step failures shouldn't block the entire pipeline |
| Work item dedup | Check existing via WIQL | Prevents duplicate work items for same repo |

## Project Structure

### Backend Changes (from spec 001 baseline)

```text
backend/app/
├── api/
│   └── autofix.py           # POST /api/autofix/{repo_id} (SSE streaming endpoint)
├── services/
│   ├── ado_client.py         # Added: get_default_branch_ref, create_branch, push_changes, create_pull_request
│   ├── ai_service.py         # Added: generate_code_fixes()
│   └── autofix.py            # AutoFixPipeline orchestrator (~475 lines)
├── models/
│   └── schemas.py            # Added: AutoFixRequest, AutoFixStepStatus, AutoFixResult
└── main.py                   # Registered autofix router
```

### Frontend Changes (from spec 001 baseline)

```text
frontend/src/
├── lib/
│   ├── types.ts              # Added: AutoFixStep, AutoFixRequest, AutoFixResult, AutoFixStepStatus type
│   └── api.ts                # Added: getAutoFixStreamUrl() URL builder
├── hooks/
│   └── useAutoFix.ts         # SSE-based pipeline hook (startAutoFix, cancel, reset, steps state)
├── components/
│   └── autofix/
│       └── AutoFixModal.tsx  # Full-screen pipeline progress modal (6 steps with icons, progress bar, result links)
└── app/
    └── repos/[id]/
        └── page.tsx          # Added "AI Auto-Fix" button + AutoFixModal integration
```

## Complexity Tracking

No constitution violations.
