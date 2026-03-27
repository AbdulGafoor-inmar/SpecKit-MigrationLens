# Research: MigrationLens Dashboard

**Feature**: 001-migration-compliance-dashboard
**Date**: 2026-03-12
**Updated**: 2026-03-27
**Status**: Complete

## Technical Decisions

### 1. Backend Framework

- **Decision**: Python 3.12+ with FastAPI
- **Rationale**: FastAPI provides async support, automatic OpenAPI docs, Pydantic v2 integration for request/response validation, and excellent performance via uvicorn. Python ecosystem has strong tooling for file I/O, YAML parsing, HTTP clients, and OpenAI SDK.
- **Alternatives considered**: Flask (no async, no built-in validation), Django (too heavyweight for API-only service), Node.js/Express (team expertise is Python-focused)

### 2. Frontend Framework

- **Decision**: Next.js 14 with App Router, React 18, TypeScript strict mode
- **Rationale**: Next.js App Router provides server components, file-based routing, and optimized builds. TypeScript strict mode catches bugs at compile time. React 18 concurrent features enable smooth UI updates.
- **Alternatives considered**: Vite + React (no SSR built-in), Angular (heavier, less ecosystem for premium UI components), SvelteKit (smaller ecosystem for charting)

### 3. Styling Approach

- **Decision**: Tailwind CSS 3.4+ with Inmar brand color system
- **Rationale**: Tailwind enables rapid UI development with utility classes. The Inmar brand system (plum primary #303584, teal #03878C, sunset #F15A22, goldenrod #FFC20E, frost #DEDCE4) provides a professional, non-generic appearance. Custom animations (fade-in, slide-up, score-fill) and glow shadows create premium feel.
- **Alternatives considered**: CSS Modules (more boilerplate), Styled Components (runtime overhead), Material UI (doesn't match brand aesthetic)

### 4. Charting Library

- **Decision**: Recharts
- **Rationale**: React-native charting with ResponsiveContainer support, built-in radar/pie/bar chart types matching our needs, customizable via component props for brand colors. Used for ComplianceRadar, VersionPieChart, and ScoreDistribution.
- **Alternatives considered**: D3.js (too low-level), Chart.js (less React-native), Nivo (heavier bundle)

### 5. Animation Library

- **Decision**: Framer Motion
- **Rationale**: Declarative animation API for React, supports mount/unmount animations, gesture handlers, and layout animations. Used for GlassCard entrance animations, score ring fills, page transitions, and staggered list reveals.
- **Alternatives considered**: React Spring (less intuitive API), CSS-only (limited for complex sequences), GSAP (not React-native)

### 6. Data Persistence

- **Decision**: Two-tier cache — in-memory dict + JSON files on disk, no database
- **Rationale**: Per constitution principle III — keeps deployment simple. In-memory cache (10 min TTL) provides fast reads for hot data. JSON file cache (configurable TTL, default 24h) provides persistence across restarts. Dashboard data stored as `dashboard_{org}.json` + `.meta.json` (timestamp).
- **Alternatives considered**: SQLite (still requires schema management), Redis (adds infrastructure dependency), PostgreSQL (violates constitution)

### 7. ADO Integration

- **Decision**: httpx async HTTP client with PAT/Basic authentication
- **Rationale**: httpx provides async/await support matching FastAPI's async handlers, connection pooling, timeout configuration. PAT tokens encoded as Basic auth (`:PAT` base64). ADO REST API v7.1+ used for repos, work items, wikis, boards, PRs, and Git operations.
- **Alternatives considered**: requests (no async), azure-devops Python SDK (heavy dependency, limited async support)

### 8. Compliance Engine Architecture

- **Decision**: YAML-defined rules with Python evaluation engine supporting 5 check types
- **Rationale**: Rules defined in YAML are human-readable, easily extensible, and version-controllable. The engine loads 55 rules at startup, supports `csproj_contains`, `csproj_not_contains`, `file_exists`, `cs_pattern`, and `file_contains` check types. Rules can target specific app types via `applies_to`. Category scores are averages excluding all-NA categories.
- **Alternatives considered**: JSON rules (less readable), hardcoded rules (not extensible)

### 9. AI Integration

- **Decision**: Azure OpenAI (AsyncAzureOpenAI client) for advanced analysis
- **Rationale**: Azure OpenAI provides enterprise-grade AI with data privacy. Used for 5 capabilities: code analysis (insights/recommendations), risk assessment (effort/risk factors), migration plan generation (phased tasks), PR review (7-dimension scoring), and auto-fix code generation. All functions return structured JSON. Graceful fallback to rule-based analysis when AI is unavailable.
- **Alternatives considered**: Direct OpenAI API (data residency concerns), local LLMs (insufficient quality for code analysis)

### 10. Structured Logging

- **Decision**: structlog with ConsoleRenderer
- **Rationale**: Produces structured logs suitable for debugging and aggregation. Supports context binding (request ID, repo name), lazy evaluation. Used throughout backend services.
- **Alternatives considered**: Python logging (unstructured), loguru (less enterprise-ready)

### 11. API Communication

- **Decision**: Direct API calls from frontend to backend via NEXT_PUBLIC_API_URL
- **Rationale**: Simple and transparent — Next.js frontend calls the backend URL directly. No proxy/rewrite layer removes a point of failure. CORS middleware on the backend handles cross-origin requests. SSE (EventSource) used for real-time streaming (auto-fix pipeline only).
- **Alternatives considered**: Next.js API rewrites (adds complexity), BFF pattern (unnecessary for this scope)
