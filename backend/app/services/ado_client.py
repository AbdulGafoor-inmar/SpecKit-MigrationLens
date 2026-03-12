"""Azure DevOps REST API client using httpx."""

from __future__ import annotations

import base64
from typing import Any

import httpx
import structlog

from app.config import get_settings

logger = structlog.get_logger()


class ADOClient:
    """Async client for Azure DevOps REST API."""

    def __init__(self, pat: str | None = None, organization: str | None = None):
        settings = get_settings()
        self._pat = pat or settings.ado_pat
        self._org = organization or settings.ado_organization
        self._base_url = f"https://dev.azure.com/{self._org}"
        token_bytes = base64.b64encode(f":{self._pat}".encode()).decode()
        self._headers = {
            "Authorization": f"Basic {token_bytes}",
            "Content-Type": "application/json",
        }

    async def _get(self, url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=self._headers, params=params)
            resp.raise_for_status()
            return resp.json()

    async def _post(self, url: str, json_data: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=self._headers, json=json_data)
            resp.raise_for_status()
            return resp.json()

    async def _patch(self, url: str, json_data: list[dict[str, Any]]) -> dict[str, Any]:
        headers = {**self._headers, "Content-Type": "application/json-patch+json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.patch(url, headers=headers, json=json_data)
            resp.raise_for_status()
            return resp.json()

    async def list_repositories(self, project: str = "") -> list[dict[str, Any]]:
        """List all Git repositories in the organization or a specific project."""
        if project:
            url = f"{self._base_url}/{project}/_apis/git/repositories"
        else:
            url = f"{self._base_url}/_apis/git/repositories"

        params = {"api-version": "7.1"}
        logger.info("listing_repositories", project=project or "all")

        try:
            data = await self._get(url, params)
            repos = data.get("value", [])
            logger.info("repositories_found", count=len(repos))
            return repos
        except httpx.HTTPStatusError as e:
            logger.error("list_repos_failed", status=e.response.status_code, detail=str(e))
            return []

    async def get_file_content(
        self, project: str, repo_id: str, path: str, branch: str = "main"
    ) -> str | None:
        """Get the content of a file from a repository."""
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/items"
        params = {
            "path": path,
            "versionDescriptor.version": branch,
            "api-version": "7.1",
            "$format": "text",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url, headers=self._headers, params=params)
                if resp.status_code == 404:
                    return None
                resp.raise_for_status()
                return resp.text
        except httpx.HTTPStatusError:
            return None

    async def list_items(
        self, project: str, repo_id: str, path: str = "/", branch: str = "main"
    ) -> list[dict[str, Any]]:
        """List items (files/folders) in a repository path."""
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/items"
        params = {
            "scopePath": path,
            "recursionLevel": "Full",
            "versionDescriptor.version": branch,
            "api-version": "7.1",
        }

        try:
            data = await self._get(url, params)
            return data.get("value", [])
        except httpx.HTTPStatusError:
            return []

    async def get_repo_metadata(self, project: str, repo_id: str) -> dict[str, Any] | None:
        """Get repository metadata including last commit info."""
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}"
        params = {"api-version": "7.1"}

        try:
            return await self._get(url, params)
        except httpx.HTTPStatusError:
            return None

    async def create_work_item(
        self,
        project: str,
        title: str,
        description: str,
        priority: int = 2,
        tags: str = "MigrationLens",
    ) -> dict[str, Any]:
        """Create a User Story work item in ADO."""
        url = f"{self._base_url}/{project}/_apis/wit/workitems/$User Story"
        params = {"api-version": "7.1"}

        patch_doc = [
            {"op": "add", "path": "/fields/System.Title", "value": title},
            {"op": "add", "path": "/fields/System.Description", "value": description},
            {
                "op": "add",
                "path": "/fields/Microsoft.VSTS.Common.Priority",
                "value": priority,
            },
            {"op": "add", "path": "/fields/System.Tags", "value": tags},
        ]

        logger.info("creating_work_item", project=project, title=title)
        url_with_params = f"{url}?api-version=7.1"
        return await self._patch(url_with_params, patch_doc)
