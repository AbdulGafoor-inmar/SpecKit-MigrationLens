<!--
  Sync Impact Report
  Version change: N/A → 1.0.0
  Added sections: Core Principles (5), Technology Constraints, Development Workflow, Governance
  Removed sections: None
  Templates requiring updates: ✅ No updates needed (initial constitution)
  Follow-up TODOs: None
-->

# MigrationLens Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)
Every feature and change MUST follow the SpecKit SDD workflow: Constitution → Specify → Plan → Tasks → Implement. No code is written without a specification. Specifications are the source of truth for what the system does. This ensures traceability from business need to implementation and prevents scope drift.

### II. Full-Stack Compliance Dashboard
MigrationLens is an AI-powered .NET 10 / C# 14 Modernization Compliance Dashboard. Every feature MUST serve the goal of scanning repositories in Azure DevOps, evaluating compliance against .NET 10/C# 14 best practices, visualizing results in a premium dashboard, and enabling migration work item creation. Features that do not serve this mission MUST be rejected.

### III. No Database — File-Based Persistence
The system MUST NOT use any relational or NoSQL database. All scan results and cached data MUST be persisted as JSON files on disk with configurable TTL. This keeps deployment simple (no DB provisioning), enables easy inspection of results, and supports air-gapped environments. The cache layer MUST handle concurrent reads/writes safely.

### IV. Premium Dark UI with Glassmorphism
The frontend MUST deliver a premium, dark-themed dashboard experience using glassmorphism design patterns, animated score visualizations, glow effects, and smooth transitions. The UI is the primary differentiator — it MUST look and feel like a premium product, not a generic admin panel. All components MUST be responsive and accessible.

### V. Azure DevOps Integration First
The system MUST integrate with Azure DevOps REST APIs as the primary source for repository scanning. It MUST support: listing repositories from ADO projects, cloning/scanning repo contents, creating user stories/work items for migration gaps, and reading wiki pages. Authentication MUST use PAT (Personal Access Token) via environment configuration.

## Technology Constraints

- **Backend**: Python 3.12+, FastAPI, Pydantic v2, httpx for async HTTP, structlog for structured logging, uvicorn as ASGI server
- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript strict mode, Tailwind CSS 3.4+, Recharts for charts, Framer Motion for animations, Lucide React for icons
- **AI Engine**: Custom compliance evaluation engine loaded from YAML specification files, scoring across 7 categories with 40+ rules
- **Infrastructure**: Docker Compose for local development, Azure Pipelines for CI/CD
- **No external AI services**: The compliance engine runs locally using rule-based evaluation — no OpenAI/Claude API calls required
- **API Design**: RESTful JSON APIs under `/api/v1` prefix, Pydantic models for request/response validation

## Development Workflow

1. All changes MUST follow the SpecKit SDD lifecycle
2. Code MUST pass linting and type checking before merge
3. Backend endpoints MUST have Pydantic request/response models
4. Frontend components MUST use TypeScript strict mode
5. Environment secrets MUST be loaded from `.env` files — never hardcoded
6. All scan results MUST be cached to avoid redundant ADO API calls
7. The frontend MUST proxy API calls to the backend via Next.js rewrites

## Governance

This constitution is the supreme governance document for MigrationLens. All specifications, plans, and implementations MUST comply with these principles. Amendments require:
1. A written proposal documenting the change and rationale
2. Version bump following semantic versioning (MAJOR for principle removal/redefinition, MINOR for additions, PATCH for clarifications)
3. Update of all dependent templates and specifications

Compliance is verified at each SpecKit phase gate. Violations MUST be justified in the Complexity Tracking section of the implementation plan.

**Version**: 1.0.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-12
