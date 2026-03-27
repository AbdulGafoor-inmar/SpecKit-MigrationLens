"""Wiki analysis service — fetches wiki pages and extracts actionable standards."""

from __future__ import annotations

import re
from typing import Any

import structlog

from app.models.schemas import WikiStandard
from app.services.ado_client import ADOClient

logger = structlog.get_logger()

# Keywords that indicate a wiki page contains coding/migration standards
STANDARD_KEYWORDS = [
    "migration", "upgrade", "standard", "guideline", "best practice",
    "coding standard", ".net", "dotnet", "csharp", "c#",
    "architecture", "convention", "template", "pattern",
    "dockerfile", "ci/cd", "pipeline", "deployment",
    "nuget", "package", "dependency", "security",
    "performance", "aot", "trimming",
    "aks", "kubernetes", "k8s", "container",
    "serilog", "logging", "polly", "swagger",
    "health", "exception", "middleware", "versioning",
    "integration test", "cqrs", "entity framework",
    "docker", "acr", "chiseled", "bootstrap", "deploy",
]

# Map wiki content keywords to compliance rule categories
CATEGORY_KEYWORD_MAP = {
    "SDK & Runtime": ["sdk", "runtime", "target framework", "net10", "net8", "net6", "dotnet version", "global.json"],
    "Language Features": ["c# 14", "c# 12", "langversion", "file-scoped", "primary constructor", "collection expression", "record type"],
    "Project Configuration": ["nullable", "implicit using", "editorconfig", "directory.build", "directory.packages", "central package", "warnings as errors"],
    "NuGet & Dependencies": ["nuget", "package", "dependency", "newtonsoft", "system.text.json", "serilog", "logging", "polly", "retry", "efcore", "bulk"],
    "Code Patterns": ["minimal api", "async", "await", "span", "memory", "record", "dto", "cqrs", "exception", "middleware", "swagger", "api version", "integration test"],
    "DevOps & CI/CD": ["docker", "dockerfile", "pipeline", "ci/cd", "azure pipeline", "health check", "containeriz", "alpine", "chiseled", "acr", "multi-stage"],
    "AKS & Kubernetes": ["aks", "kubernetes", "k8s", "deployment.yaml", "cronjob", "ingress", "bootstrap", "deploy.sh", "workload identity", "security context", "non-root"],
    "Performance & AOT": ["aot", "native aot", "trimming", "source generator", "caching", "output cache", "performance"],
}

# Specific actionable items to extract from wiki pages keyed by page path keywords
WIKI_ACTION_ITEMS: dict[str, list[dict[str, str]]] = {
    "coding standards": [
        {"action": "Use Serilog with @ sign for AppInsights column names and pascal case", "category": "NuGet & Dependencies"},
        {"action": "Avoid try-catch in internal methods — use exception middleware for APIs", "category": "Code Patterns"},
        {"action": "Use Finance NuGet package for auth tokens; always get token just before HTTP call", "category": "NuGet & Dependencies"},
        {"action": "Use Polly retry only for safe idempotent calls (GET, SELECT)", "category": "NuGet & Dependencies"},
        {"action": "Use Ticketing API for generating tickets; log ticket number on AppInsights", "category": "Code Patterns"},
        {"action": "For large data sets, use set-based approach instead of row-by-row loops", "category": "Code Patterns"},
        {"action": "Docker: always compare with latest standard, use smallest image, minimal layers, use ACR cache", "category": "DevOps & CI/CD"},
        {"action": "Release pipelines: delete createResources.ps1 task and replace tokens task", "category": "DevOps & CI/CD"},
    ],
    "docker best practices": [
        {"action": "Use multi-stage Dockerfile: build stage (sdk) + runtime stage (aspnet/runtime)", "category": "DevOps & CI/CD"},
        {"action": "Build: use financeteamdev.azurecr.io/dotnet/sdk/custom for token support or /sdk for no token", "category": "DevOps & CI/CD"},
        {"action": "Runtime: use financeteamdev.azurecr.io/dotnet/aspnet/custom for WebAPI, /runtime/custom for console apps", "category": "DevOps & CI/CD"},
        {"action": "Upgrade to .NET 10 chiseled images: mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled", "category": "DevOps & CI/CD"},
        {"action": "Run as non-root USER app on port 8080, add Alpine packages (icu-libs, krb5-libs, etc.)", "category": "DevOps & CI/CD"},
        {"action": "Set DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false for Alpine containers", "category": "DevOps & CI/CD"},
    ],
    "healthcheck standard": [
        {"action": "Add /api/v1.0/Health endpoint (anonymous), /Health/apikey (API key), /Health/token (token secured)", "category": "Code Patterns"},
        {"action": "Add ApiVersioning with HeaderApiVersionReader('api-version') and default version 1.0", "category": "Code Patterns"},
        {"action": "Health endpoint should return { UTCTime } JSON object", "category": "Code Patterns"},
    ],
    "logging standards using serilog": [
        {"action": "Install Serilog standard packages: Serilog.Extensions.Logging.ApplicationInsights, Serilog.Sinks.ApplicationInsights, Serilog.Enrichers.CallerInfo", "category": "NuGet & Dependencies"},
        {"action": "Use Serilog.Enrichers.CallerInfo for source line number tracking", "category": "NuGet & Dependencies"},
        {"action": "Add LoggingMiddleware class for user identification in AppInsights requests", "category": "Code Patterns"},
        {"action": "Log release labels: BUILD_BUILDNUMBER, BUILD_SOURCEVERSION, RELEASE_RELEASENAME on startup", "category": "DevOps & CI/CD"},
    ],
    "kubernetes best practices": [
        {"action": "Add securityContext: runAsUser:1654, runAsNonRoot:true, seccompProfile:RuntimeDefault", "category": "AKS & Kubernetes"},
        {"action": "Set container securityContext: allowPrivilegeEscalation:false, readOnlyRootFilesystem:true", "category": "AKS & Kubernetes"},
        {"action": "Mount /tmp as emptyDir volume for writable temp space", "category": "AKS & Kubernetes"},
        {"action": "Use containerPort 8080 (non-root), standard resources: cpu 25m-200m, memory 100Mi-512Mi", "category": "AKS & Kubernetes"},
        {"action": "Add deployment metadata annotations: BUILD_BUILDID, BUILD_BUILDNUMBER, RELEASE_RELEASENAME", "category": "AKS & Kubernetes"},
    ],
    "migration process to new aks": [
        {"action": "Create bootstrap/ folder with bootstrap.sh, AddAnnotationOnAppInsights.sh", "category": "AKS & Kubernetes"},
        {"action": "Use deploy-api.sh (APIs) or deploy-cronjob.sh (CronJobs) with az aks get-credentials + kubelogin", "category": "AKS & Kubernetes"},
        {"action": "Add Azure Workload Identity: labels azure.workload.identity/use:'true', serviceAccountName:'workload-sa'", "category": "AKS & Kubernetes"},
        {"action": "Set automountServiceAccountToken: false in pod spec", "category": "AKS & Kubernetes"},
        {"action": "Parameterize cluster names: AKS_CLUSTER_NAME, AKS_RESOURCE_GROUP_NAME, AKS_SUBSCRIPTION_ID", "category": "AKS & Kubernetes"},
        {"action": "API deployments: green/blue with deploy-api.sh, swapIngress.sh, scaleDownOldDeployment.sh", "category": "AKS & Kubernetes"},
    ],
    "custom dotnet base images": [
        {"action": "Use custom ACR images: financeteamdev.azurecr.io/dotnet/sdk/custom, /aspnet/custom, /runtime/custom", "category": "DevOps & CI/CD"},
        {"action": "Custom images include Azure Artifacts credential provider and InmarFinance NuGet feed", "category": "DevOps & CI/CD"},
        {"action": "Custom runtime images include required Alpine packages and run as USER app", "category": "DevOps & CI/CD"},
    ],
    "polly": [
        {"action": "Add Polly, Polly.Extensions.Http, Polly.Contrib.WaitAndRetry packages", "category": "NuGet & Dependencies"},
        {"action": "Use HttpClientFactory with Polly policy: AddHttpClient('name').SetHandlerLifetime(5min)", "category": "NuGet & Dependencies"},
        {"action": "Use DecorrelatedJitterBackoffV2 for retry delays", "category": "NuGet & Dependencies"},
        {"action": "Only retry safe operations: GET/SELECT. Never retry PUT/DELETE/INSERT", "category": "Code Patterns"},
    ],
    "swagger description templates": [
        {"action": "Add [SwaggerOperation(Summary, Description)] with route params, responses, security details", "category": "Code Patterns"},
        {"action": "Add [ProducesResponseType] for 200, 400, 404 on every endpoint", "category": "Code Patterns"},
        {"action": "Use consistent endpoint naming and description format per Finance template", "category": "Code Patterns"},
    ],
    "cqrs": [
        {"action": "Commands should not return values; IDs must be supplied to POST endpoints", "category": "Code Patterns"},
        {"action": "CommandHandler properties are read-only, set via constructor", "category": "Code Patterns"},
        {"action": "Requests (queries) NEVER alter system state — read-only operations", "category": "Code Patterns"},
        {"action": "Aggregate properties have private setters; use Apply() for event sourcing", "category": "Code Patterns"},
    ],
    "entity framework bulk": [
        {"action": "Install EFCore.BulkExtensions for BulkInsert/BulkUpdate/BulkDelete operations", "category": "NuGet & Dependencies"},
        {"action": "Replace loop-based row-by-row EF operations with bulk operations for performance", "category": "NuGet & Dependencies"},
    ],
    "integration testing": [
        {"action": "Use IClassFixture<TestSetup> pattern with dedicated Utils class for setup", "category": "Code Patterns"},
        {"action": "Follow Arrange/Act/Assert pattern; name test classes as <ClassUnderTest>IntegrationTests", "category": "Code Patterns"},
        {"action": "Use [DisplayName] to describe test scenario and expected outcome", "category": "Code Patterns"},
    ],
    "acr": [
        {"action": "Use Finance ACR cache (financeteamdev.azurecr.io) instead of pulling directly from MCR/DockerHub", "category": "DevOps & CI/CD"},
        {"action": "Pull once to trigger ACR cache: az acr login + docker pull financeteamdev.azurecr.io/dotnet/...", "category": "DevOps & CI/CD"},
    ],
    "azure build pipeline": [
        {"action": "Use Docker@2 task for build and push with containerRegistry and tags: $(BUILD.BUILDNUMBER)", "category": "DevOps & CI/CD"},
        {"action": "Always use BUILD.BUILDNUMBER as docker image tag (no 'latest' in production)", "category": "DevOps & CI/CD"},
        {"action": "Use separate build jobs for parallel project builds when possible", "category": "DevOps & CI/CD"},
        {"action": "Publish artifacts to build pipeline AND storage account for deployment", "category": "DevOps & CI/CD"},
    ],
}


class WikiAnalyzer:
    """Fetches and analyzes wiki pages to extract actionable standards."""

    def __init__(self, client: ADOClient):
        self._client = client

    async def analyze_project_wikis(self, project: str) -> list[WikiStandard]:
        """Fetch all wiki pages for a project and extract relevant standards."""
        standards: list[WikiStandard] = []

        # Limit: fetch content from at most MAX_PAGES most-relevant wiki pages
        MAX_PAGES = 30

        try:
            wikis = await self._client.list_wikis(project)
            if not wikis:
                logger.info("no_wikis_found", project=project)
                return standards

            # Collect all relevant page paths across all wikis first
            relevant_pages: list[tuple[str, str, str]] = []  # (wiki_id, wiki_name, path)

            for wiki in wikis:
                wiki_id = wiki.get("id", "")
                wiki_name = wiki.get("name", "")
                logger.info("analyzing_wiki", wiki=wiki_name)

                try:
                    pages = await self._client.list_wiki_pages(project, wiki_id)
                    for page in pages:
                        page_path = page.get("path", "/")
                        if self._is_relevant_page(page_path):
                            relevant_pages.append((wiki_id, wiki_name, page_path))
                except Exception as e:
                    logger.warning("wiki_list_error", wiki=wiki_name, error=str(e))

            # Prioritise Finance IT / Code and Development Guidelines pages
            def _priority(item: tuple[str, str, str]) -> int:
                path = item[2].lower()
                if "code and development guidelines" in path:
                    return 0
                if "finance it" in path:
                    return 1
                return 2

            relevant_pages.sort(key=_priority)
            relevant_pages = relevant_pages[:MAX_PAGES]
            logger.info("relevant_wiki_pages", count=len(relevant_pages))

            for wiki_id, wiki_name, page_path in relevant_pages:
                try:
                    page_data = await self._client.get_wiki_page(
                        project, wiki_id, page_path, include_content=True
                    )
                    if not page_data:
                        continue

                    content = page_data.get("content", "")
                    if not content:
                        continue

                    page_standards = self._extract_standards(
                        content, page_path, wiki_name, wiki_id, project
                    )
                    standards.extend(page_standards)

                except Exception as e:
                    logger.warning(
                        "wiki_page_fetch_error",
                        wiki=wiki_name,
                        path=page_path,
                        error=str(e),
                    )

        except Exception as e:
            logger.error("wiki_analysis_error", project=project, error=str(e))

        logger.info("wiki_standards_extracted", count=len(standards))
        return standards

    def _is_relevant_page(self, page_path: str) -> bool:
        """Check if a wiki page path suggests it contains standards."""
        path_lower = page_path.lower()
        # Skip archived pages
        if "/archive/" in path_lower:
            return False
        return any(kw in path_lower for kw in STANDARD_KEYWORDS)

    def _extract_standards(
        self,
        content: str,
        page_path: str,
        wiki_name: str,
        wiki_id: str,
        project: str,
    ) -> list[WikiStandard]:
        """Extract actionable standards from wiki page content."""
        standards: list[WikiStandard] = []
        content_lower = content.lower()
        path_lower = page_path.lower()

        # Determine which compliance categories this page relates to
        related_rules: list[str] = []
        for category, keywords in CATEGORY_KEYWORD_MAP.items():
            if any(kw in content_lower for kw in keywords):
                related_rules.append(category)

        if not related_rules:
            return standards

        # Extract title from first heading or page path
        title = page_path.split("/")[-1].replace("-", " ").strip("/")
        heading_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if heading_match:
            title = heading_match.group(1).strip()

        # Build wiki page URL
        settings_org = self._client._org
        encoded_path = page_path.replace(" ", "%20")
        url = f"https://dev.azure.com/{settings_org}/{project}/_wiki/wikis/{wiki_id}?pagePath={encoded_path}"

        # Find matching action items for this page
        action_items: list[str] = []
        for page_key, actions in WIKI_ACTION_ITEMS.items():
            if page_key in path_lower:
                action_items = [a["action"] for a in actions]
                # Update related_rules from action item categories
                action_categories = list(set(a["category"] for a in actions))
                for cat in action_categories:
                    if cat not in related_rules:
                        related_rules.append(cat)
                break

        # Build concise content summary: actionable items only (no raw wiki markup)
        if action_items:
            content_summary = "Action items:\n" + "\n".join(f"• {a}" for a in action_items)
        else:
            # Fallback: extract bullet points and key sentences
            content_summary = self._extract_action_summary(content)

        standards.append(
            WikiStandard(
                title=title,
                source_page=page_path,
                wiki_name=wiki_name,
                content_summary=content_summary,
                related_rules=related_rules,
                url=url,
            )
        )

        return standards

    def _extract_action_summary(self, content: str) -> str:
        """Extract a concise actionable summary from wiki content."""
        actions: list[str] = []

        for line in content.split("\n"):
            stripped = line.strip()
            # Skip markdown headings, images, empty lines, links-only lines
            if not stripped or stripped.startswith("#") or stripped.startswith("!["):
                continue
            if stripped.startswith("http") and " " not in stripped:
                continue

            # Pick up bullet point items (- xxx, * xxx, 1. xxx)
            bullet_match = re.match(r"^[-*]\s+(.+)", stripped)
            numbered_match = re.match(r"^\d+\.\s+(.+)", stripped)
            if bullet_match:
                text = bullet_match.group(1).strip()
                if len(text) > 10 and not text.startswith("["):
                    actions.append(f"• {text}")
            elif numbered_match:
                text = numbered_match.group(1).strip()
                if len(text) > 10:
                    actions.append(f"• {text}")

            if len(actions) >= 8:
                break

        if actions:
            return "\n".join(actions)
        # Last resort: first meaningful paragraph
        for line in content.split("\n"):
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and len(stripped) > 20:
                return stripped[:300]
        return ""
