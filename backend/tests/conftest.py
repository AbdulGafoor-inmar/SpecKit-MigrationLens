import pytest
import pytest_asyncio
import os
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

# Set test env vars before importing app
os.environ.setdefault("ADO_PAT", "test-pat")
os.environ.setdefault("ADO_ORGANIZATION", "test-org")
os.environ.setdefault("ADO_PROJECT", "test-project")

from app.main import create_app  # noqa: E402


@pytest.fixture
def app():
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_repo_info():
    return {
        "id": "repo-1",
        "name": "TestRepo",
        "url": "https://dev.azure.com/org/project/_git/TestRepo",
        "default_branch": "refs/heads/main",
        "last_commit_date": "2025-01-01T00:00:00Z",
        "size_kb": 1024,
    }


@pytest.fixture
def sample_scan_result(sample_repo_info):
    return {
        "repository": sample_repo_info,
        "overall_score": 75.0,
        "compliance_status": "fail",
        "dotnet_version": "net8.0",
        "csharp_version": "12",
        "categories": [
            {
                "category": "SDK & Runtime",
                "score": 50.0,
                "passed": 1,
                "total": 2,
                "results": [
                    {
                        "rule_id": "sdk-001",
                        "rule_name": "Target .NET 10",
                        "category": "SDK & Runtime",
                        "severity": "critical",
                        "status": "fail",
                        "message": "Project does not target net10.0",
                    },
                ],
            }
        ],
        "scan_timestamp": "2025-01-01T00:00:00Z",
        "complexity": "moderate",
    }


@pytest.fixture
def sample_dashboard(sample_scan_result):
    return {
        "organization": "test-org",
        "project": "test-project",
        "total_repositories": 1,
        "scanned_repositories": 1,
        "average_score": 75.0,
        "passing_repositories": 0,
        "failing_repositories": 1,
        "repositories": [sample_scan_result],
        "scan_timestamp": "2025-01-01T00:00:00Z",
        "category_averages": {"SDK & Runtime": 50.0},
    }
