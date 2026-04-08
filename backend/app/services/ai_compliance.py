"""AI-powered compliance engine — evaluates repos against wiki-defined rules.

Replaces the regex-based ComplianceEngine for scanning. Instead of YAML patterns,
this engine fetches the migration rules wiki page and sends repo file contents
to Azure OpenAI for evaluation against each rule.
"""

from __future__ import annotations

import json
import re
from typing import Any

import structlog

from app.config import get_settings
from app.models.enums import ComplianceStatus, Severity
from app.models.schemas import CategoryScore, ComplianceResult
from app.services.ado_client import ADOClient
from app.services import ai_service

logger = structlog.get_logger()

# Cache wiki content in memory to avoid re-fetching per repo during a scan
_wiki_rules_cache: dict[str, str] = {}


# Regex for full-URL wiki links: [Title](https://dev.azure.com/.../wiki/.../pageId/slug)
_WIKI_URL_LINK_RE = re.compile(
    r'\[([^\]]+)\]\(https://dev\.azure\.com/[^)]+/_wiki/wikis/[^/]+/(\d+)/[^)]+\)'
)

# Regex for path-based wiki links: [Title](/Some-Path/Sub-Path)
# Matches links starting with / but excludes image attachments.
# Allows backslash-escaped parens \( \) inside the path.
_WIKI_PATH_LINK_RE = re.compile(
    r'\[([^\]]+)\]\((/((?:[^()\s\\]|\\[()])+(?:/(?:[^()\s\\]|\\[()])+)*))\)'
)

# Hard cap to prevent runaway recursion
_MAX_WIKI_PAGES = 30


def _wiki_path_to_api_path(raw_path: str) -> str:
    """Convert a wiki markdown path (hyphens) to the API path format (spaces).

    Wiki markdown uses hyphens and backslash-escaped parens:
      /Finance-IT/Code-and-Development-Guidelines/Ticketing-Api-Usage
      /Resources/Azure-Cloud/Azure-Kubernetes-Services-\\(AKS\\)-Cluster/...

    The API expects spaces and real parens:
      /Finance IT/Code and Development Guidelines/Ticketing Api Usage
      /Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/...

    In ADO wiki URLs, %2D represents a literal hyphen that should stay as-is.
    Regular hyphens are word separators (converted to spaces).
    """
    import urllib.parse
    # Strip anchor fragments (e.g., #section-name)
    path = raw_path.split("#")[0]
    # Remove markdown backslash escaping
    path = path.replace("\\(", "(").replace("\\)", ")")
    # Preserve literal hyphens: %2D → placeholder before general decode
    _LITERAL_HYPHEN = "\x00HYPHEN\x00"
    path = path.replace("%2D", _LITERAL_HYPHEN).replace("%2d", _LITERAL_HYPHEN)
    # Decode remaining percent-encoding
    path = urllib.parse.unquote(path)
    # Replace word-separator hyphens with spaces
    path = path.replace("-", " ")
    # Restore literal hyphens
    path = path.replace(_LITERAL_HYPHEN, "-")
    # Collapse multiple consecutive spaces into one
    while "  " in path:
        path = path.replace("  ", " ")
    # Strip trailing spaces or dimension suffixes from image-style links
    path = path.split(" =")[0].strip()
    return path


def _extract_wiki_links(content: str) -> list[tuple[str, str | None, int | None]]:
    """Extract wiki links from content. Returns list of (title, path_or_none, id_or_none)."""
    links: list[tuple[str, str | None, int | None]] = []
    seen: set[str] = set()

    # 1) Full-URL links (have page ID)
    for match in _WIKI_URL_LINK_RE.finditer(content):
        title = match.group(1)
        page_id = int(match.group(2))
        key = f"id:{page_id}"
        if key not in seen:
            seen.add(key)
            links.append((title, None, page_id))

    # 2) Path-based links
    for match in _WIKI_PATH_LINK_RE.finditer(content):
        title = match.group(1)
        raw_path = match.group(2)
        # Skip attachments, image links, and anchor-only links
        if raw_path.startswith("/.attachments/") or raw_path.startswith("#"):
            continue
        api_path = _wiki_path_to_api_path(raw_path)
        # Skip if anchor stripping left an empty or root-only path
        if not api_path or api_path == "/":
            continue
        key = f"path:{api_path}"
        if key not in seen:
            seen.add(key)
            links.append((title, api_path, None))

    return links


async def _fetch_wiki_page(
    client: ADOClient,
    project: str,
    wiki_id: str,
    title: str,
    path: str | None,
    page_id: int | None,
) -> dict | None:
    """Fetch a wiki page by ID or path, returning the page data or None."""
    if page_id is not None:
        return await client.get_wiki_page_by_id(project, wiki_id, page_id, include_content=True)
    if path:
        return await client.get_wiki_page(project, wiki_id, path, include_content=True)
    return None


async def _fetch_wiki_pages_recursive(
    client: ADOClient,
    project: str,
    wiki_id: str,
    title: str,
    path: str | None,
    page_id: int | None,
    seen_keys: set[str],
    collected: list[tuple[str, str, int | None]],
) -> None:
    """Recursively fetch a wiki page and any wiki pages it links to.

    Supports both ID-based and path-based references.
    """
    # Build a dedup key
    key = f"id:{page_id}" if page_id is not None else f"path:{path}"
    if key in seen_keys or len(collected) >= _MAX_WIKI_PAGES:
        return
    seen_keys.add(key)

    sp_data = await _fetch_wiki_page(client, project, wiki_id, title, path, page_id)
    if not sp_data:
        logger.warning("wiki_ref_page_not_found", title=title, path=path, page_id=page_id)
        return

    sp_content = sp_data.get("content", "")
    sp_page_id = sp_data.get("id")
    sp_path = sp_data.get("path", path or f"page-{page_id}")
    if not sp_content:
        return

    # Also mark the resolved ID/path as seen to prevent revisits
    if sp_page_id and f"id:{sp_page_id}" not in seen_keys:
        seen_keys.add(f"id:{sp_page_id}")
    if sp_path and f"path:{sp_path}" not in seen_keys:
        seen_keys.add(f"path:{sp_path}")

    collected.append((title or sp_path, sp_content, sp_page_id))
    logger.info("wiki_ref_page_fetched", title=title, page_id=sp_page_id,
                path=sp_path, length=len(sp_content), depth=len(collected))

    # Find child links inside this page and recurse
    child_links = _extract_wiki_links(sp_content)
    for child_title, child_path, child_id in child_links:
        child_key = f"id:{child_id}" if child_id is not None else f"path:{child_path}"
        if child_key not in seen_keys and len(collected) < _MAX_WIKI_PAGES:
            await _fetch_wiki_pages_recursive(
                client, project, wiki_id, child_title, child_path, child_id,
                seen_keys, collected,
            )


async def fetch_wiki_rules(client: ADOClient, project: str) -> str:
    """Fetch the migration rules wiki page and recursively fetch all linked wiki pages.

    Follows wiki reference links to any depth until no new links are found,
    up to _MAX_WIKI_PAGES total referenced pages.
    """
    cache_key = f"{project}"
    if cache_key in _wiki_rules_cache:
        return _wiki_rules_cache[cache_key]

    settings = get_settings()

    # List wikis to find the project wiki
    wikis = await client.list_wikis(project)
    if not wikis:
        logger.warning("no_wikis_found", project=project)
        return ""

    # Use the first project wiki
    wiki_id = ""
    for w in wikis:
        if w.get("type") == "projectWiki":
            wiki_id = w.get("id", "")
            break
    if not wiki_id:
        wiki_id = wikis[0].get("id", "")

    # Fetch the main rules page
    page_path = settings.wiki_rules_page_path
    page = await client.get_wiki_page(project, wiki_id, page_path, include_content=True)

    if not page:
        logger.warning("wiki_rules_page_not_found", path=page_path)
        return ""

    content = page.get("content", "")
    if not content:
        logger.warning("wiki_rules_page_empty", path=page_path)
        return ""

    # Find wiki links in the main page, then recursively follow them
    seen_keys: set[str] = set()
    # Avoid re-fetching the main page
    main_page_id = page.get("id")
    if main_page_id:
        seen_keys.add(f"id:{main_page_id}")
    seen_keys.add(f"path:{page_path}")

    collected: list[tuple[str, str, int | None]] = []
    top_links = _extract_wiki_links(content)
    for title, link_path, link_id in top_links:
        await _fetch_wiki_pages_recursive(
            client, project, wiki_id, title, link_path, link_id,
            seen_keys, collected,
        )

    logger.info("wiki_recursive_fetch_done", total_ref_pages=len(collected),
                titles=[t for t, _, _ in collected])

    # Combine main page + all recursively fetched pages
    combined = content
    if collected:
        combined += "\n\n=== REFERENCED WIKI PAGES (recursively fetched) ===\n"
        for title, sub_content, pid in collected:
            combined += f"\n\n--- WIKI PAGE: {title} (id={pid}) ---\n{sub_content}"
        logger.info("wiki_pages_combined", main_length=len(content),
                     ref_count=len(collected), total_length=len(combined))

    _wiki_rules_cache[cache_key] = combined
    logger.info("wiki_rules_fetched", path=page_path, length=len(combined),
                ref_pages=len(collected))
    return combined


def clear_wiki_cache() -> None:
    """Clear the wiki rules cache (call at start of each scan)."""
    _wiki_rules_cache.clear()


async def evaluate_repo_with_ai(
    repo_name: str,
    csproj_files: list[tuple[str, str]],
    cs_files: list[tuple[str, str]],
    file_list: list[str],
    extra_files: dict[str, str],
    app_type: str,
    wiki_rules_content: str,
) -> tuple[list[ComplianceResult], list[CategoryScore]]:
    """Evaluate a repository against wiki rules using AI.

    Sends the repo's file contents and the wiki rules to Azure OpenAI,
    which returns structured pass/fail results per rule.

    Args:
        repo_name: Repository name
        csproj_files: List of (path, content) for .csproj files
        cs_files: List of (path, content) for .cs files
        file_list: All file paths in the repo
        extra_files: Content of specific files (Dockerfile, deployment.yaml, etc.)
        app_type: Detected app type (api, cronjob, worker, library)
        wiki_rules_content: Raw markdown content of the wiki rules page

    Returns:
        Tuple of (compliance results, category scores)
    """
    if not wiki_rules_content:
        logger.warning("no_wiki_rules_for_ai_scan", repo=repo_name)
        return [], []

    # Build file context for the AI
    file_context = _build_file_context(csproj_files, cs_files, file_list, extra_files)

    # Send to AI for evaluation
    results = await _ai_evaluate(repo_name, app_type, file_context, file_list, wiki_rules_content)

    # Compute category scores
    category_scores = _compute_category_scores(results)

    return results, category_scores


def _build_file_context(
    csproj_files: list[tuple[str, str]],
    cs_files: list[tuple[str, str]],
    file_list: list[str],
    extra_files: dict[str, str],
) -> str:
    """Build a text summary of all repo files for the AI prompt."""
    sections: list[str] = []

    # .csproj files (full content — critical for rule evaluation)
    for path, content in csproj_files[:5]:
        sections.append(f"--- {path} ---\n{content[:3000]}")

    # .cs files
    for path, content in cs_files[:15]:
        sections.append(f"--- {path} ---\n{content[:2500]}")

    # Extra files (Dockerfile, deployment.yaml, etc.)
    for fname, content in extra_files.items():
        sections.append(f"--- {fname} ---\n{content[:2500]}")

    # File listing (so AI can check file_exists rules)
    file_listing = "\n".join(file_list[:300])
    sections.append(f"--- FILE LISTING ---\n{file_listing}")

    return "\n\n".join(sections)


async def _ai_evaluate(
    repo_name: str,
    app_type: str,
    file_context: str,
    file_list: list[str],
    wiki_rules: str,
) -> list[ComplianceResult]:
    """Call Azure OpenAI to evaluate the repo against wiki rules."""

    messages = [
        {
            "role": "system",
            "content": (
                "You are a .NET migration compliance auditor. You evaluate repositories "
                "against a set of migration rules defined in a wiki page.\n\n"
                "RULES (from wiki page AND its sub-pages):\n"
                f"{wiki_rules[:80000]}\n\n"
                "CRITICAL INSTRUCTIONS:\n\n"
                "A. WIKI SUB-PAGES: The rules above include content from wiki sub-pages. "
                "When a rule references a wiki page (e.g., 'see wiki reference', 'follow the wiki page', "
                "'fetch and follow the actual code from the wiki page'), the sub-page content is provided above "
                "under '=== WIKI SUB-PAGES ==='. You MUST read and use that sub-page content to thoroughly "
                "evaluate the rule. Check implementation patterns, code examples, and requirements from sub-pages "
                "before concluding pass/fail/na.\n\n"
                "B. STRICT RULE SCOPE: For each rule, check ONLY what that specific rule asks for. "
                "Do NOT add extra checks, do NOT invent requirements, do NOT check things the rule does not mention. "
                "If Rule 1 says 'check TargetFramework in .csproj', ONLY check TargetFramework — nothing else. "
                "If Rule 3 says 'check Serilog patterns', ONLY check Serilog — do not check unrelated logging. "
                "Each rule is self-contained. Stay within the rule's scope.\n\n"
                "C. EVIDENCE-BASED: Base your verdict ONLY on the files provided. "
                "If the rule requires a specific file/pattern and you can see it → evaluate it. "
                "If you cannot see the relevant files → follow the status decision guide below.\n\n"
                "EVALUATION STEPS:\n"
                "1. Read each numbered rule from the wiki page above.\n"
                "2. If a rule references a wiki sub-page, find and read it from the SUB-PAGES section above.\n"
                "3. You MUST return exactly one result per numbered rule in the wiki. "
                "If the wiki has 13 rules, you MUST return 13 results.\n"
                "4. For each rule, check ONLY what that rule specifies — nothing more, nothing less.\n"
                "5. Status MUST be one of: \"pass\", \"fail\", or \"na\".\n\n"
                "STATUS DECISION GUIDE — follow these rules strictly:\n\n"
                "MANDATORY RULES (must be present in every repo):\n"
                "- Rule 1 (.NET 10 Target Framework): Check .csproj files. "
                "If targeting net10.0 → pass. If targeting older framework → fail. Never na.\n"
                "- Rule 2 (NuGet Packages): Check .csproj PackageReferences. "
                "If deprecated packages found (MediatR, AutoMapper, Newtonsoft.Json) → fail. "
                "If all packages are .NET 10 compatible → pass. Never na.\n"
                "- Rule 3 (Serilog Logging): Check logging setup and patterns. "
                "If Serilog is properly configured with all required classes → pass. "
                "If logging exists but doesn't meet standards → fail. Never na.\n"
                "- Rule 5 (App Configuration): Check for Azure App Configuration setup. "
                "If key filters use correct colon patterns → pass. "
                "If no App Configuration setup exists → na. "
                "If setup exists but uses wrong patterns → fail.\n"
                "- Rule 11 (AKS Migration): Check k8s/ folder and deployment files. "
                "If correct manifests exist with required security context → pass. "
                "If deployment files exist but are incomplete/wrong → fail. "
                "If no deployment files at all → fail (migration required).\n"
                "- Rule 13 (SpecKit): Check for specs/ folder at repo root. "
                "If specs/ folder exists with spec.md, plan.md, tasks.md → pass. "
                "If specs/ folder is missing or incomplete → fail. Never na — this is required for ALL repos.\n\n"
                "CONDITIONAL RULES (depends on whether the feature exists in the repo):\n"
                "- Rule 4 (Exception Middleware): Only applies to API projects. "
                "If app_type is not 'api' → na. "
                "If API has centralized ExceptionMiddleware → pass. "
                "If API has scattered try-catch without middleware → fail.\n"
                "- Rule 6 (Email Standards): Only if email-sending code exists. "
                "If no email code/config found in .ps1 scripts, .cs files, or App Configuration → na. "
                "If email code uses correct format → pass. If wrong format → fail.\n"
                "- Rule 7 (Auth Package): Only if outbound HTTP calls with auth exist. "
                "If no HTTP calls needing auth tokens → na. "
                "If HTTP calls exist but no Inmar.Finance.Authentication → fail. "
                "If package is properly used → pass.\n"
                "- Rule 8 (Polly Retry): Only if outbound HTTP calls exist. "
                "If no HttpClient/outbound calls → na. "
                "If HTTP calls exist without Polly → fail. If Polly is configured → pass.\n"
                "- Rule 9 (Ticketing API): DEPENDS ON RULE 6. "
                "If the repo has email-sending code or email config in .ps1 scripts, .cs files, or App Configuration keys "
                "→ Rule 9 APPLIES (the project sends emails so it must also use Ticketing API). "
                "If the project has email code but no Ticketing API → fail. "
                "If the project has email code AND Ticketing API properly implemented → pass. "
                "If the repo has NO email-sending code at all → na (no emails = no ticketing needed).\n"
                "- Rule 10 (Set-Based Processing): Only if large dataset processing exists. "
                "If no loop-based data processing → na. "
                "If row-by-row processing found → fail. If set-based → pass.\n\n"
                "REMOVAL RULES (pass if the bad thing is absent):\n"
                "- Rule 12 (Delete CreateResources.ps1): "
                "If CreateResources.ps1 does NOT exist in the repo → pass (already compliant). "
                "If it exists → fail. Never na.\n\n"
                "5. Return a JSON array of results, one per rule.\n\n"
                "Each result must have:\n"
                '- "rule_number": the rule number from the wiki (1, 2, 3...)\n'
                '- "rule_name": short name of the rule\n'
                '- "category": one of "SDK & Runtime", "NuGet & Dependencies", '
                '"Configuration", "DevOps & CI/CD", "AKS & Kubernetes", '
                '"Logging & Monitoring", "Performance"\n'
                '- "status": "pass", "fail", or "na"\n'
                '- "severity": "critical", "high", "medium", or "low"\n'
                '- "details": explanation of what was found or what is missing\n'
                '- "file_path": the file path where the issue was found (or where the fix should go), or "" if N/A\n'
                '- "line_number": approximate line number if applicable, or null\n'
                '- "current_code": the current code snippet that violates the rule (if any)\n'
                '- "suggested_fix": what the code should look like to comply\n'
                '- "migration_guide": step-by-step instructions to fix this issue\n\n'
                "Return ONLY a valid JSON array. No markdown fences, no explanations outside the JSON."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Repository: {repo_name}\n"
                f"Application Type: {app_type} (THIS IS A CONFIRMED {app_type.upper()} PROJECT)\n\n"
                f"Repository files:\n{file_context[:30000]}\n\n"
                "Evaluate this repository against ALL the wiki rules and return the JSON array. "
                "You MUST return exactly one result for each numbered rule. "
                f"This project type is '{app_type}' — apply API-specific rules like Rule 4 (Exception Middleware) accordingly."
            ),
        },
    ]

    raw = await ai_service._chat(messages, temperature=0.1, max_tokens=12000)
    if not raw:
        logger.warning("ai_compliance_empty_response", repo=repo_name)
        return []

    return _parse_ai_results(raw, repo_name)


def _parse_ai_results(raw: str, repo_name: str) -> list[ComplianceResult]:
    """Parse the AI's JSON response into ComplianceResult objects."""
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error("ai_compliance_parse_error", repo=repo_name, raw_length=len(raw))
        return []

    if not isinstance(data, list):
        # Maybe it's wrapped in a key
        if isinstance(data, dict):
            data = data.get("results", data.get("rules", []))
        if not isinstance(data, list):
            logger.error("ai_compliance_unexpected_format", repo=repo_name)
            return []

    results: list[ComplianceResult] = []
    for item in data:
        if not isinstance(item, dict):
            continue

        # Map status string to enum
        status_str = str(item.get("status", "na")).lower()
        if status_str == "pass":
            status = ComplianceStatus.PASS
        elif status_str == "fail":
            status = ComplianceStatus.FAIL
        else:
            status = ComplianceStatus.NA

        # Map severity string
        sev_str = str(item.get("severity", "medium")).lower()
        try:
            severity = Severity(sev_str)
        except ValueError:
            severity = Severity.MEDIUM

        rule_num = item.get("rule_number", 0)
        rule_name = item.get("rule_name", f"Rule {rule_num}")

        def _to_str(val: Any) -> str:
            """Coerce value to string — AI sometimes returns lists."""
            if isinstance(val, list):
                return "\n".join(str(v) for v in val)
            return str(val) if val else ""

        results.append(
            ComplianceResult(
                rule_id=f"WIKI-{rule_num:03d}",
                rule_name=rule_name,
                category=item.get("category", "General"),
                status=status,
                severity=severity,
                details=_to_str(item.get("details", "")),
                file_path=item.get("file_path") or None,
                line_number=item.get("line_number"),
                current_code=_to_str(item.get("current_code", "")),
                suggested_fix=_to_str(item.get("suggested_fix", "")) if status == ComplianceStatus.FAIL else "",
                migration_guide=_to_str(item.get("migration_guide", "")) if status == ComplianceStatus.FAIL else "",
            )
        )

    logger.info("ai_compliance_parsed", repo=repo_name, total=len(results),
                passed=sum(1 for r in results if r.status == ComplianceStatus.PASS),
                failed=sum(1 for r in results if r.status == ComplianceStatus.FAIL))

    return results


def _compute_category_scores(results: list[ComplianceResult]) -> list[CategoryScore]:
    """Compute aggregated scores per category."""
    categories: dict[str, dict[str, int]] = {}

    for r in results:
        if r.category not in categories:
            categories[r.category] = {"passed": 0, "failed": 0, "na": 0}

        if r.status == ComplianceStatus.PASS:
            categories[r.category]["passed"] += 1
        elif r.status == ComplianceStatus.FAIL:
            categories[r.category]["failed"] += 1
        else:
            categories[r.category]["na"] += 1

    scores: list[CategoryScore] = []
    for cat_name, counts in categories.items():
        evaluated = counts["passed"] + counts["failed"]
        score = (counts["passed"] / evaluated * 100) if evaluated > 0 else 0.0

        scores.append(
            CategoryScore(
                category=cat_name,
                score=round(score, 1),
                total_rules=counts["passed"] + counts["failed"] + counts["na"],
                passed=counts["passed"],
                failed=counts["failed"],
                not_applicable=counts["na"],
            )
        )

    return scores


def compute_overall_score(category_scores: list[CategoryScore]) -> float:
    """Compute overall score as average of category scores (excluding all-NA)."""
    valid_scores = [cs.score for cs in category_scores if (cs.passed + cs.failed) > 0]
    if not valid_scores:
        return 0.0
    return round(sum(valid_scores) / len(valid_scores), 1)
