# MigrationLens

> AI-Powered .NET 10 / C# 14 Modernization Compliance Dashboard

MigrationLens scans your Azure DevOps repositories and evaluates their compliance with .NET 10 and C# 14 modernization standards across 7 categories and 30+ rules. View results in a premium dark-themed dashboard with glassmorphism styling, interactive charts, and real-time scan progress.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)             │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │ Dashboard  │ │ Repo      │ │ Charts (Recharts)  │ │
│  │ Summary    │ │ Detail    │ │ Radar/Pie/Area     │ │
│  └───────────┘ └───────────┘ └────────────────────┘ │
│         Tailwind CSS + Glassmorphism + Framer Motion │
├─────────────────────────────────────────────────────┤
│                    Backend (FastAPI)                  │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │ ADO Client │ │ Scanner   │ │ Compliance Engine  │ │
│  │ (httpx)    │ │ Service   │ │ (YAML Rules)       │ │
│  └───────────┘ └───────────┘ └────────────────────┘ │
│  ┌───────────┐ ┌───────────┐                        │
│  │ Cache      │ │ WorkItems │ JSON File Cache       │
│  │ (JSON)     │ │ Service   │ (No Database)         │
│  └───────────┘ └───────────┘                        │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12+, FastAPI, Pydantic v2, httpx, structlog |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS 3.4+ |
| Charts | Recharts 2.x |
| Animation | Framer Motion 11.x |
| Icons | Lucide React |
| Persistence | JSON file cache (no database) |
| Containerization | Docker Compose |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker & Docker Compose (optional)
- Azure DevOps PAT with **Code (Read)** and **Work Items (Read & Write)** scope

### Docker Compose (Recommended)

```bash
cp .env.example .env
# Edit .env with your ADO credentials
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Local Development

```bash
# Backend
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADO_PAT` | Yes | Azure DevOps Personal Access Token |
| `ADO_ORGANIZATION` | Yes | Azure DevOps organization name |
| `ADO_PROJECT` | No | Filter to a specific project |
| `CACHE_DIR` | No | Cache directory (default: `.cache`) |
| `CACHE_TTL` | No | Cache TTL in seconds (default: 3600) |

## Compliance Categories

1. **SDK & Runtime** — Target framework, SDK version, runtime identifiers
2. **Language Features** — C# 14 features usage
3. **Project Configuration** — Nullable, implicit usings, central package management
4. **NuGet & Dependencies** — Package versions, deprecation, vulnerabilities
5. **Code Patterns** — Modern async, spans, minimal APIs
6. **DevOps & CI/CD** — Build pipelines, containerization, health checks
7. **Performance & AOT** — Native AOT readiness, trimming, source generators

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard summary |
| POST | `/api/scan` | Trigger compliance scan |
| GET | `/api/scan/progress` | Scan progress |
| GET | `/api/repos/{repo_id}` | Repo compliance detail |
| POST | `/api/workitems` | Create ADO work item |
| GET | `/api/export` | Export report (JSON/CSV) |

## License

MIT
