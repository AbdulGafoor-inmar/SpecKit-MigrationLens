"""Tests for the API endpoints."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

import os
os.environ.setdefault("ADO_PAT", "test-pat")
os.environ.setdefault("ADO_ORGANIZATION", "test-org")
os.environ.setdefault("ADO_PROJECT", "test-project")

from app.main import create_app  # noqa: E402

pytestmark = pytest.mark.asyncio


@pytest.fixture
def app():
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_health(client):
    """GET /health should return 200 with status ok."""
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert "version" in body
    assert "timestamp" in body


async def test_dashboard_no_data(client):
    """GET /dashboard without cached data should return 404."""
    resp = await client.get("/api/dashboard?organization=test-org")
    assert resp.status_code == 404


async def test_scan_progress_idle(client):
    """GET /scan/progress when no scan is running should return idle state."""
    resp = await client.get("/api/scan/progress")
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_scanning"] is False


async def test_repo_not_found(client):
    """GET /repos/{id} for unknown repo should return 404."""
    resp = await client.get("/api/repos/nonexistent-id")
    assert resp.status_code == 404


async def test_export_no_data(client):
    """GET /export without data should return 404."""
    resp = await client.get("/api/export?organization=test-org&format=json")
    assert resp.status_code == 404


async def test_workitems_validation(client):
    """POST /workitems with missing fields should return 422."""
    resp = await client.post("/api/workitems", json={})
    assert resp.status_code == 422
