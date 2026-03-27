<!--
  Sync Impact Report
  Version change: 1.0.0 → 2.0.0
  Added sections: AI-Augmented Analysis (Principle VI), updated Technology Constraints, updated rule counts
  Changed sections: Principle II (8 categories / 55 rules), Technology Constraints (Azure OpenAI added, API prefix corrected)
  Removed sections: "No external AI services" constraint
  Templates requiring updates: None
  Follow-up TODOs: None
-->

# MigrationLens Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)
Every feature and change MUST follow the SpecKit SDD workflow: Constitution → Specify → Plan → Tasks → Implement. No code is written without a specification. Specifications are the source of truth for what the system does. This ensures traceability from business need to implementation and prevents scope drift.

### II. Full-Stack Compliance Dashboard
MigrationLens is an AI-powered .NET 10 / C# 14 Modernization Compliance Dashboard. Every feature MUST serve the goal of scanning repositories in Azure DevOps, evaluating compliance against .NET 10/C# 14 best practices, visualizing results in a premium dashboard, and enabling migration work item creation. The compliance engine evaluates repositories against 55 rules across 8 categories (SDK & Runtime, Language Features, Project Configuration, NuGet & Dependencies, Code Patterns, DevOps & CI/CD, AKS & Kubernetes, Performance & AOT). Features that do not serve this mission MUST be rejected.

### III. No Database — File-Based Persistence
The system MUST NOT use any relational or NoSQL database. All scan results and cached data MUST be persisted as JSON files on disk with configurable TTL. An in-memory cache layer provides fast reads with a short TTL, backed by JSON files on disk with a longer TTL. This keeps deployment simple (no DB provisioning), enables easy inspection of results, and supports air-gapped environments.

### IV. Premium Branded UI
The frontend MUST deliver a premium, branded dashboard experience using the Inmar color system (plum, teal, sunset, goldenrod, frost), card-based layouts, animated score visualizations, glow effects, and smooth transitions. The UI is the primary differentiator — it MUST look and feel like a premium product, not a generic admin panel. All components MUST be responsive and accessible.

### V. Azure DevOps Integration First
The system MUST integrate with Azure DevOps REST APIs as the primary source for repository scanning. It MUST support: listing repositories from ADO projects, scanning repo file contents (csproj, cs, Dockerfile, YAML), creating user stories/work items for migration gaps, browsing wiki pages, viewing boards and work items, managing pull requests, and Git operations (branch/push/PR creation). Authentication MUST use PAT (Personal Access Token) via environment configuration.

### VI. AI-Augmented Analysis
The system MUST integrate with Azure OpenAI for advanced analysis capabilities: deep code analysis with insights and recommendations, risk assessment with effort estimation, migration plan generation with phased tasks, AI-powered PR review with multi-dimensional scoring, and automated code fix generation for the auto-fix pipeline. When AI is unavailable, the system MUST gracefully fall back to rule-based analysis.

## Technology Constraints

- **Backend**: Python 3.12+, FastAPI, Pydantic v2, httpx for async HTTP, structlog for structured logging, uvicorn as ASGI server
- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript strict mode, Tailwind CSS 3.4+, Recharts for charts, Framer Motion for animations, Lucide React for icons
- **Compliance Engine**: YAML-defined rule evaluation engine with 55 rules across 8 categories, supporting check types: csproj_contains, csproj_not_contains, file_exists, cs_pattern, file_contains
- **AI Services**: Azure OpenAI (GPT-35-turbo or configurable deployment) for code analysis, risk assessment, migration planning, PR review, and auto-fix code generation
- **Infrastructure**: Docker Compose for local development, standalone Next.js output for Docker builds
- **API Design**: RESTful JSON APIs under `/api` prefix, Pydantic models for request/response validation, SSE for real-time streaming (auto-fix pipeline)

## Development Workflow

1. All changes MUST follow the SpecKit SDD lifecycle
2. Code MUST pass linting and type checking before merge
3. Backend endpoints MUST have Pydantic request/response models
4. Frontend components MUST use TypeScript strict mode
5. Environment secrets MUST be loaded from `.env` files — never hardcoded
6. All scan results MUST be cached (in-memory + JSON file) to avoid redundant ADO API calls
7. The frontend calls the backend API directly via `NEXT_PUBLIC_API_URL` environment variable

## Governance

This constitution is the supreme governance document for MigrationLens. All specifications, plans, and implementations MUST comply with these principles. Amendments require:
1. A written proposal documenting the change and rationale
2. Version bump following semantic versioning (MAJOR for principle removal/redefinition, MINOR for additions, PATCH for clarifications)
3. Update of all dependent templates and specifications

Compliance is verified at each SpecKit phase gate. Violations MUST be justified in the Complexity Tracking section of the implementation plan.

**Version**: 2.0.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-27
