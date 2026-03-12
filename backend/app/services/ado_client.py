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

    # ── Wiki API ────────────────────────────────────────────────────────────

    async def list_wikis(self, project: str) -> list[dict[str, Any]]:
        """List all wikis in a project."""
        url = f"{self._base_url}/{project}/_apis/wiki/wikis"
        params = {"api-version": "7.1"}
        logger.info("listing_wikis", project=project)

        try:
            data = await self._get(url, params)
            wikis = data.get("value", [])
            logger.info("wikis_found", count=len(wikis))
            return wikis
        except httpx.HTTPStatusError as e:
            logger.error("list_wikis_failed", status=e.response.status_code)
            return []

    async def get_wiki_page(
        self, project: str, wiki_id: str, path: str = "/", include_content: bool = True
    ) -> dict[str, Any] | None:
        """Get a wiki page by path, optionally including content."""
        url = f"{self._base_url}/{project}/_apis/wiki/wikis/{wiki_id}/pages"
        params: dict[str, Any] = {
            "path": path,
            "includeContent": str(include_content).lower(),
            "api-version": "7.1",
        }
        logger.info("getting_wiki_page", project=project, wiki=wiki_id, path=path)

        try:
            return await self._get(url, params)
        except httpx.HTTPStatusError as e:
            logger.error("get_wiki_page_failed", status=e.response.status_code, path=path)
            return None

    async def list_wiki_pages(
        self, project: str, wiki_id: str, path: str = "/", recursion_level: str = "full"
    ) -> list[dict[str, Any]]:
        """List wiki pages under a given path (returns page tree)."""
        # ADO paged-list via pages batch endpoint
        url = f"{self._base_url}/{project}/_apis/wiki/wikis/{wiki_id}/pagesbatch"
        params = {"api-version": "7.1"}
        body: dict[str, Any] = {
            "pageViewOptions": {"top": 100},
        }
        logger.info("listing_wiki_pages", project=project, wiki=wiki_id, path=path)

        try:
            data = await self._post(url, body)
            pages = data.get("value", [])
            logger.info("wiki_pages_found", count=len(pages))
            return pages
        except httpx.HTTPStatusError as e:
            logger.error("list_wiki_pages_failed", status=e.response.status_code)
            return []

    # ── Work Item Queries ───────────────────────────────────────────────────

    async def query_work_items(
        self, project: str, wiql: str, top: int = 200
    ) -> list[dict[str, Any]]:
        """Execute a WIQL query and return full work item details."""
        url = f"{self._base_url}/{project}/_apis/wit/wiql"
        params = {"api-version": "7.1", "$top": top}
        logger.info("querying_work_items", project=project)

        try:
            result = await self._post(url, {"query": wiql})
            work_item_refs = result.get("workItems", [])

            if not work_item_refs:
                return []

            # Batch-fetch full work item details (max 200 per call)
            ids = [str(wi["id"]) for wi in work_item_refs[:top]]
            return await self._get_work_items_by_ids(ids)
        except httpx.HTTPStatusError as e:
            logger.error("wiql_query_failed", status=e.response.status_code)
            return []

    async def _get_work_items_by_ids(self, ids: list[str]) -> list[dict[str, Any]]:
        """Fetch work items by their IDs (batch)."""
        if not ids:
            return []

        url = f"{self._base_url}/_apis/wit/workitems"
        params = {
            "ids": ",".join(ids),
            "$expand": "relations",
            "api-version": "7.1",
        }

        try:
            data = await self._get(url, params)
            return data.get("value", [])
        except httpx.HTTPStatusError:
            return []

    async def get_work_item(self, project: str, work_item_id: int) -> dict[str, Any] | None:
        """Get a single work item by ID."""
        url = f"{self._base_url}/{project}/_apis/wit/workitems/{work_item_id}"
        params = {"$expand": "relations", "api-version": "7.1"}

        try:
            return await self._get(url, params)
        except httpx.HTTPStatusError:
            return None

    async def list_boards(self, project: str, team: str = "") -> list[dict[str, Any]]:
        """List boards for a project/team."""
        team_segment = f"/{team}" if team else ""
        url = f"{self._base_url}/{project}{team_segment}/_apis/work/boards"
        params = {"api-version": "7.1"}
        logger.info("listing_boards", project=project, team=team)

        try:
            data = await self._get(url, params)
            boards = data.get("value", [])
            logger.info("boards_found", count=len(boards))
            return boards
        except httpx.HTTPStatusError as e:
            logger.error("list_boards_failed", status=e.response.status_code)
            return []

    async def get_board_columns(
        self, project: str, board: str = "Stories", team: str = ""
    ) -> list[dict[str, Any]]:
        """Get columns for a board (e.g. 'Stories', 'Epics')."""
        team_segment = f"/{team}" if team else ""
        url = f"{self._base_url}/{project}{team_segment}/_apis/work/boards/{board}/columns"
        params = {"api-version": "7.1"}

        try:
            data = await self._get(url, params)
            return data.get("value", [])
        except httpx.HTTPStatusError:
            return []

    async def list_work_items_on_board(
        self, project: str, board: str = "Stories", team: str = ""
    ) -> list[dict[str, Any]]:
        """Get all work items on a board using a WIQL query that matches the board type."""
        board_type_map = {
            "Stories": "User Story",
            "Epics": "Epic",
            "Features": "Feature",
            "Bugs": "Bug",
        }
        work_item_type = board_type_map.get(board, "User Story")

        wiql = (
            f"SELECT [System.Id], [System.Title], [System.State], "
            f"[System.AssignedTo], [Microsoft.VSTS.Common.Priority], "
            f"[System.Tags], [System.CreatedDate], [System.ChangedDate] "
            f"FROM WorkItems "
            f"WHERE [System.TeamProject] = '{project}' "
            f"AND [System.WorkItemType] = '{work_item_type}' "
            f"ORDER BY [System.ChangedDate] DESC"
        )

        return await self.query_work_items(project, wiql)
