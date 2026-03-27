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

    async def find_migration_work_item(
        self,
        project: str,
        repo_name: str,
    ) -> dict[str, Any] | None:
        """Find an existing MigrationLens work item for a given repo.

        Returns the first active (non-Removed) work item that matches, or None.
        """
        # WIQL: search by tag + title prefix.  Use NOT IN instead of <>
        # because <> causes issues with some shells / encoding.
        safe_name = repo_name.replace("'", "''")
        wiql = (
            "SELECT [System.Id], [System.Title], [System.State] "
            "FROM WorkItems "
            "WHERE [System.Tags] CONTAINS 'MigrationLens' "
            f"AND [System.Title] CONTAINS '{safe_name}' "
            "AND [System.State] NOT IN ('Removed', 'Closed') "
            "ORDER BY [System.CreatedDate] DESC"
        )
        items = await self.query_work_items(project, wiql)
        if items:
            logger.info(
                "existing_work_item_found",
                id=items[0].get("id"),
                repo=repo_name,
            )
            return items[0]
        return None

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
        except Exception as e:
            logger.warning("get_wiki_page_error", path=path, error=str(e))
            return None

    async def list_wiki_pages(
        self, project: str, wiki_id: str, path: str = "/", recursion_level: str = "full"
    ) -> list[dict[str, Any]]:
        """List wiki pages under a given path (returns flat list from recursive tree)."""
        url = f"{self._base_url}/{project}/_apis/wiki/wikis/{wiki_id}/pages"
        params = {
            "path": path,
            "recursionLevel": recursion_level,
            "api-version": "7.1",
        }
        logger.info("listing_wiki_pages", project=project, wiki=wiki_id, path=path)

        try:
            data = await self._get(url, params)
            # Flatten the recursive subPages tree into a flat list
            pages: list[dict[str, Any]] = []
            self._flatten_wiki_pages(data, pages)
            logger.info("wiki_pages_found", count=len(pages))
            return pages
        except httpx.HTTPStatusError as e:
            logger.error("list_wiki_pages_failed", status=e.response.status_code)
            return []

    def _flatten_wiki_pages(self, page: dict[str, Any], result: list[dict[str, Any]]) -> None:
        """Recursively flatten a wiki page tree into a flat list."""
        result.append({
            "id": page.get("id", 0),
            "path": page.get("path", "/"),
            "order": page.get("order", 0),
            "gitItemPath": page.get("gitItemPath", ""),
            "remoteUrl": page.get("remoteUrl", ""),
        })
        for sub in page.get("subPages", []):
            self._flatten_wiki_pages(sub, result)

    # ── Work Item Queries ───────────────────────────────────────────────────

    async def query_work_items(
        self, project: str, wiql: str, top: int = 200
    ) -> list[dict[str, Any]]:
        """Execute a WIQL query and return full work item details."""
        url = f"{self._base_url}/{project}/_apis/wit/wiql?api-version=7.1&$top={top}"
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

    # ── Pull Request API ────────────────────────────────────────────────────

    async def list_pull_requests(
        self, project: str, repo_id: str, status: str = "active", top: int = 50
    ) -> list[dict[str, Any]]:
        """List pull requests for a repository."""
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/pullrequests"
        params = {
            "searchCriteria.status": status,
            "$top": top,
            "api-version": "7.1",
        }
        try:
            data = await self._get(url, params)
            return data.get("value", [])
        except httpx.HTTPStatusError as e:
            logger.error("list_prs_failed", status=e.response.status_code)
            return []

    async def get_pull_request(
        self, project: str, repo_id: str, pr_id: int
    ) -> dict[str, Any] | None:
        """Get a single pull request detail."""
        url = f"{self._base_url}/{project}/_apis/git/pullrequests/{pr_id}"
        params = {"api-version": "7.1"}
        try:
            return await self._get(url, params)
        except httpx.HTTPStatusError:
            return None

    async def get_pr_iterations(
        self, project: str, repo_id: str, pr_id: int
    ) -> list[dict[str, Any]]:
        """Get PR iterations (push groups)."""
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/pullrequests/{pr_id}/iterations"
        params = {"api-version": "7.1"}
        try:
            data = await self._get(url, params)
            return data.get("value", [])
        except httpx.HTTPStatusError:
            return []

    async def get_pr_changes(
        self, project: str, repo_id: str, pr_id: int
    ) -> list[dict[str, Any]]:
        """Get the changed files in a PR (from iterations)."""
        iterations = await self.get_pr_iterations(project, repo_id, pr_id)
        if not iterations:
            return []
        last_iter = iterations[-1]["id"]
        url = (
            f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}"
            f"/pullrequests/{pr_id}/iterations/{last_iter}/changes"
        )
        params = {"api-version": "7.1", "$top": 200}
        try:
            data = await self._get(url, params)
            return data.get("changeEntries", [])
        except httpx.HTTPStatusError:
            return []

    async def get_pr_diff(
        self, project: str, repo_id: str, pr_id: int, max_files: int = 15
    ) -> dict[str, str]:
        """Get the actual file diffs for a PR (file path → content).

        Uses the merge commit to fetch file content so it works for both
        active and completed PRs (source branch may be deleted).
        """
        pr = await self.get_pull_request(project, repo_id, pr_id)
        if not pr:
            return {}

        # For completed PRs: use lastMergeCommit or lastMergeSourceCommit
        # For active PRs: use source branch
        merge_commit = pr.get("lastMergeSourceCommit", {}).get("commitId", "")
        source_branch = pr.get("sourceRefName", "").replace("refs/heads/", "")

        changes = await self.get_pr_changes(project, repo_id, pr_id)
        if not changes:
            return {}

        diffs: dict[str, str] = {}
        file_count = 0

        for change in changes:
            item = change.get("item", {})
            path = item.get("path", "")
            change_type = change.get("changeType", "")

            # Skip non-code files
            if not path or item.get("isFolder"):
                continue
            ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
            basename = path.rsplit("/", 1)[-1].lower() if "/" in path else path.lower()

            # Allow known code/config filenames without extensions (e.g. Dockerfile)
            known_filenames = {"dockerfile", "makefile", "gemfile", "rakefile", "procfile", ".gitignore", ".editorconfig", ".dockerignore"}

            if ext not in (
                # .NET
                "cs", "csproj", "sln", "razor", "cshtml", "props", "targets",
                # Web
                "ts", "tsx", "js", "jsx", "html", "css", "scss", "less", "vue", "svelte",
                # Python
                "py", "pyx", "pyi",
                # Java / JVM
                "java", "kt", "kts", "scala", "gradle",
                # Go / Rust
                "go", "rs",
                # Config / Data
                "json", "yaml", "yml", "xml", "toml", "ini", "cfg", "env",
                "config", "properties",
                # DevOps / Infra
                "sh", "ps1", "bash", "bat", "cmd", "tf", "hcl",
                # Docs / Text
                "md", "txt", "rst", "csv",
                # SQL
                "sql",
                # Docker / K8s (filename-based handled below)
            ) and basename not in known_filenames:
                continue

            file_count += 1
            if file_count > max_files:
                break

            if change_type in ("add", "edit", "rename", "1", "2", "16"):
                content = None
                # Try fetching by commit first (works for completed PRs)
                if merge_commit:
                    content = await self._get_file_by_commit(
                        project, repo_id, path, merge_commit
                    )
                # Fallback: try source branch (works for active PRs)
                if not content and source_branch:
                    content = await self.get_file_content(
                        project, repo_id, path, source_branch
                    )
                if content:
                    diffs[path] = content
            elif change_type in ("delete", "17"):
                diffs[path] = f"[DELETED FILE: {path}]"

        return diffs

    async def _get_file_by_commit(
        self, project: str, repo_id: str, path: str, commit_id: str
    ) -> str | None:
        """Get file content at a specific commit."""
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/items"
        params = {
            "path": path,
            "versionDescriptor.versionType": "commit",
            "versionDescriptor.version": commit_id,
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

    async def get_pr_work_items(
        self, project: str, repo_id: str, pr_id: int
    ) -> list[dict[str, Any]]:
        """Get work items linked to a pull request."""
        url = (
            f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}"
            f"/pullrequests/{pr_id}/workitems"
        )
        params = {"api-version": "7.1"}
        try:
            data = await self._get(url, params)
            refs = data.get("value", [])
            if not refs:
                return []
            # Fetch full work item details
            ids = [str(r.get("id", "")) for r in refs if r.get("id")]
            if ids:
                return await self._get_work_items_by_ids(ids)
            return []
        except httpx.HTTPStatusError:
            return []

    async def post_pr_comment(
        self, project: str, repo_id: str, pr_id: int, comment: str
    ) -> dict[str, Any] | None:
        """Post a comment thread on a pull request."""
        url = (
            f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}"
            f"/pullrequests/{pr_id}/threads"
        )
        params = {"api-version": "7.1"}
        body = {
            "comments": [
                {
                    "parentCommentId": 0,
                    "content": comment,
                    "commentType": 1,
                }
            ],
            "status": 1,  # Active
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{url}?api-version=7.1",
                    headers=self._headers,
                    json=body,
                )
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("post_pr_comment_failed", status=e.response.status_code)
            return None

    # ── Git Operations (Branch / Push / PR Creation) ────────────────────────

    async def get_default_branch_ref(
        self, project: str, repo_id: str
    ) -> tuple[str, str]:
        """Get the default branch name and its latest commit SHA.

        Returns (ref_name, object_id) e.g. ("refs/heads/main", "abc123...").
        Falls back to master if main doesn't exist.
        """
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/refs"

        for branch in ("main", "master"):
            params = {"filter": f"heads/{branch}", "api-version": "7.1"}
            try:
                data = await self._get(url, params)
                refs = data.get("value", [])
                if refs:
                    ref = refs[0]
                    logger.info(
                        "default_branch_found",
                        branch=branch,
                        commit=ref["objectId"][:8],
                    )
                    return ref["name"], ref["objectId"]
            except httpx.HTTPStatusError:
                continue

        raise RuntimeError(
            f"Could not find main or master branch for repo {repo_id}"
        )

    async def create_branch(
        self,
        project: str,
        repo_id: str,
        branch_name: str,
        source_commit: str,
    ) -> dict[str, Any]:
        """Create a new branch from a source commit SHA.

        branch_name should be just the name, e.g. 'feature/my-branch'.
        """
        url = f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/refs"
        params = {"api-version": "7.1"}

        body = [
            {
                "name": f"refs/heads/{branch_name}",
                "oldObjectId": "0" * 40,  # all zeros = create new ref
                "newObjectId": source_commit,
            }
        ]

        logger.info(
            "creating_branch",
            repo=repo_id,
            branch=branch_name,
            from_commit=source_commit[:8],
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{url}?api-version=7.1",
                headers=self._headers,
                json=body,
            )
            resp.raise_for_status()
            result = resp.json()

        refs = result.get("value", [])
        if refs and refs[0].get("success", True):
            logger.info("branch_created", branch=branch_name)
            return refs[0]
        else:
            error_msg = refs[0].get("customMessage", "Unknown error") if refs else "No ref returned"
            raise RuntimeError(f"Failed to create branch: {error_msg}")

    async def push_changes(
        self,
        project: str,
        repo_id: str,
        branch_name: str,
        changes: dict[str, str],
        commit_message: str,
        source_commit: str,
    ) -> dict[str, Any]:
        """Push file changes as a single commit to a branch.

        Args:
            changes: dict of {file_path: new_content} — paths should start with /
            commit_message: git commit message
            source_commit: the commit SHA the branch currently points to
        """
        url = (
            f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}/pushes"
        )

        change_list = []
        for file_path, content in changes.items():
            # Ensure path starts with /
            path = file_path if file_path.startswith("/") else f"/{file_path}"
            change_list.append(
                {
                    "changeType": "edit",
                    "item": {"path": path},
                    "newContent": {
                        "content": content,
                        "contentType": "rawtext",
                    },
                }
            )

        body = {
            "refUpdates": [
                {
                    "name": f"refs/heads/{branch_name}",
                    "oldObjectId": source_commit,
                }
            ],
            "commits": [
                {
                    "comment": commit_message,
                    "changes": change_list,
                }
            ],
        }

        logger.info(
            "pushing_changes",
            repo=repo_id,
            branch=branch_name,
            files=len(changes),
        )

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{url}?api-version=7.1",
                headers=self._headers,
                json=body,
            )
            resp.raise_for_status()
            result = resp.json()

        logger.info("push_completed", push_id=result.get("pushId"))
        return result

    async def create_pull_request(
        self,
        project: str,
        repo_id: str,
        source_branch: str,
        target_branch: str,
        title: str,
        description: str,
        work_item_id: int | None = None,
    ) -> dict[str, Any]:
        """Create a pull request.

        Args:
            source_branch: just the name, e.g. 'feature/my-branch'
            target_branch: just the name, e.g. 'main'
            work_item_id: optional ADO work item to link
        """
        url = (
            f"{self._base_url}/{project}/_apis/git/repositories/{repo_id}"
            f"/pullrequests"
        )

        body: dict[str, Any] = {
            "sourceRefName": f"refs/heads/{source_branch}",
            "targetRefName": f"refs/heads/{target_branch}",
            "title": title,
            "description": description,
        }

        if work_item_id:
            body["workItemRefs"] = [{"id": str(work_item_id)}]

        logger.info(
            "creating_pull_request",
            repo=repo_id,
            source=source_branch,
            target=target_branch,
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{url}?api-version=7.1",
                headers=self._headers,
                json=body,
            )
            resp.raise_for_status()
            result = resp.json()

        pr_id = result.get("pullRequestId", 0)
        logger.info("pull_request_created", pr_id=pr_id)
        return result
