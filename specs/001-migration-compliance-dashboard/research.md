# Research: MigrationLens Dashboard

**Feature**: 001-migration-compliance-dashboard
**Date**: 2026-03-12
**Status**: Complete

## Technical Decisions

### 1. Backend Framework

- **Decision**: Python 3.12+ with FastAPI
- **Rationale**: FastAPI provides async support, automatic OpenAPI docs, Pydantic v2 integration for request/response validation, and excellent performance via uvicorn. Python ecosystem has strong tooling for file I/O, YAML parsing, and HTTP clients.
- **Alternatives considered**: Flask (no async, no built-in validation), Django (too heavyweight for API-only service), Node.js/Express (team expertise is Python-focused)

### 2. Frontend Framework

- **Decision**: Next.js 14 with App Router, React 18, TypeScript strict mode
- **Rationale**: Next.js App Router provides server components, file-based routing, built-in API rewrites (solving CORS), and optimized builds. TypeScript strict mode catches bugs at compile time. React 18 concurrent features enable smooth UI updates.
- **Alternatives considered**: Vite + React (no SSR/rewrites built-in), Angular (heavier, less ecosystem for glassmorphism components), SvelteKit (smaller ecosystem for charting)

### 3. Styling Approach

- **Decision**: Tailwind CSS 3.4+ with custom dark theme and glassmorphism utilities
- **Rationale**: Tailwind enables rapid UI development with utility classes, custom theme extension for brand colors and glow effects, and purging for minimal bundle size. Glassmorphism effects (backdrop-blur, semi-transparent backgrounds) are natively supported.
- **Alternatives considered**: CSS Modules (more boilerplate), Styled Components (runtime overhead), Material UI (doesn't match premium dark aesthetic)

### 4. Charting Library

- **Decision**: Recharts
- **Rationale**: React-native charting with ResponsiveContainer support, built-in radar/pie/bar chart types matching our needs, dark theme customization via component props, and active maintenance.
- **Alternatives considered**: D3.js (too low-level), Chart.js (less React-native), Nivo (heavier bundle)

### 5. Animation Library

- **Decision**: Framer Motion
- **Rationale**: Declarative animation API for React, supports mount/unmount animations, gesture handlers, and layout animations. Perfect for score ring animations, page transitions, and card hover effects.
- **Alternatives considered**: React Spring (less intuitive API), CSS-only (limited for complex sequences), GSAP (not React-native)

### 6. Data Persistence

- **Decision**: JSON file cache on disk, no database
- **Rationale**: Per constitution principle III — keeps deployment simple, enables easy inspection of results, supports air-gapped environments. Each scan result is stored as a separate JSON file keyed by repo name hash. TTL-based invalidation via file modification time.
- **Alternatives considered**: SQLite (still requires schema management), Redis (adds infrastructure dependency), PostgreSQL (violates constitution)

### 7. ADO Integration

- **Decision**: httpx async HTTP client with PAT authentication
- **Rationale**: httpx provides async/await support matching FastAPI's async handlers, connection pooling, timeout configuration, and retry capabilities. PAT tokens are the simplest auth method for ADO REST API.
- **Alternatives considered**: requests (no async), azure-devops Python SDK (heavy dependency, limited async support)

### 8. Compliance Engine Architecture

- **Decision**: YAML-defined rules with Python evaluation engine
- **Rationale**: Rules defined in YAML are human-readable, easily extensible, and version-controllable. The Python engine loads rules at startup, evaluates each against repository file contents, and computes scores. No external AI service needed — deterministic rule evaluation.
- **Alternatives considered**: JSON rules (less readable), hardcoded rules (not extensible), external AI API (adds latency, cost, non-determinism)

### 9. Structured Logging

- **Decision**: structlog
- **Rationale**: Produces JSON-structured logs suitable for log aggregation. Supports context binding (request ID, repo name), lazy evaluation, and integration with Python's standard logging.
- **Alternatives considered**: Python logging (unstructured), loguru (less enterprise-ready)

### 10. Docker Strategy

- **Decision**: Docker Compose with separate backend and frontend containers
- **Rationale**: Enables local development parity with production, independent scaling, and clear service boundaries. Backend uses Python slim image, frontend uses multi-stage Node.js Alpine build.
- **Alternatives considered**: Single container (harder to debug/scale), Kubernetes (overkill for initial deployment)
