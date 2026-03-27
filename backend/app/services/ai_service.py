"""Azure OpenAI service — AI-powered code analysis, wiki summarization,
migration planning, and risk assessment for .NET 10 / C# 14 migration."""

from __future__ import annotations

import json
import re
from typing import Any

import structlog
from openai import AsyncAzureOpenAI

from app.config import get_settings

logger = structlog.get_logger()


def _get_client() -> AsyncAzureOpenAI | None:
    """Create an Azure OpenAI client if configured."""
    settings = get_settings()
    if not settings.azure_openai_endpoint or not settings.azure_openai_api_key:
        logger.warning("azure_openai_not_configured")
        return None
    return AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
    )


async def _chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> str:
    """Send a chat completion request to Azure OpenAI."""
    client = _get_client()
    if not client:
        return ""
    settings = get_settings()
    try:
        response = await client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error("azure_openai_error", error=str(e))
        return ""


# ── 1. Smart Code Analysis ─────────────────────────────────────────────────


async def analyze_code(
    repo_name: str,
    failing_rules: list[dict[str, Any]],
    file_snippets: dict[str, str],
) -> dict[str, Any]:
    """AI-powered deep analysis of repository code for .NET 10 / C# 14 migration.

    Returns an analysis with:
    - summary: high-level migration assessment
    - insights: list of AI-discovered issues beyond rule-based checks
    - recommendations: prioritized action list
    """
    # Build context about failing rules
    rules_text = "\n".join(
        f"- [{r.get('rule_id', '')}] {r.get('rule_name', '')}: {r.get('details', '')} "
        f"(severity: {r.get('severity', 'medium')}, file: {r.get('file_path', 'N/A')})"
        for r in failing_rules[:20]
    )

    # Build file snippets context (limit to keep under token limit)
    snippets_text = ""
    for fpath, content in list(file_snippets.items())[:5]:
        # Truncate each snippet
        truncated = content[:1500]
        snippets_text += f"\n--- {fpath} ---\n{truncated}\n"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a .NET migration expert specializing in upgrading projects to "
                ".NET 10 and C# 14. You analyze repository code and compliance scan results "
                "to provide deep, actionable migration insights.\n\n"
                "Focus on:\n"
                "1. Patterns that automated rules can't catch (architectural issues, "
                "   code smells, deprecated API usage)\n"
                "2. .NET 10 / C# 14 specific opportunities (field keyword, extension types, "
                "   partial properties, null-conditional improvements)\n"
                "3. Performance improvements possible with modern .NET\n"
                "4. Security considerations for containerized deployment\n\n"
                "Return valid JSON with this structure:\n"
                '{"summary": "...", "insights": [{"title": "...", "description": "...", '
                '"severity": "high|medium|low", "category": "..."}], '
                '"recommendations": [{"priority": 1, "action": "...", "effort": "low|medium|high", '
                '"impact": "low|medium|high"}]}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Repository: {repo_name}\n\n"
                f"Failing compliance rules:\n{rules_text}\n\n"
                f"Code snippets from the repository:\n{snippets_text}\n\n"
                "Analyze this repository and provide migration insights beyond "
                "what the rule-based scanner already found."
            ),
        },
    ]

    raw = await _chat(messages, max_tokens=2500)
    if not raw:
        return {"summary": "", "insights": [], "recommendations": []}

    try:
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE)
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        logger.warning("ai_code_analysis_parse_error", raw_length=len(raw))
        return {"summary": raw[:500], "insights": [], "recommendations": []}


# ── 2. Wiki Summarization ──────────────────────────────────────────────────


async def summarize_wiki_page(
    page_title: str,
    page_content: str,
    categories: list[str],
) -> dict[str, Any]:
    """AI-powered summarization of a wiki page into actionable migration standards.

    Returns:
    - action_items: list of concise, actionable items extracted from the page
    - relevance_score: 0-100 score for how relevant this page is to .NET 10 migration
    - key_technologies: list of technologies/tools mentioned
    """
    # Truncate content to fit token limit
    content_truncated = page_content[:3000]

    messages = [
        {
            "role": "system",
            "content": (
                "You are a technical standards analyst. Given a wiki page from a Finance "
                "team's standards wiki, extract SPECIFIC, ACTIONABLE items that a developer "
                "must follow when building or migrating .NET applications.\n\n"
                "Focus on concrete actions like:\n"
                "- Specific packages to install (with names)\n"
                "- Configuration patterns to apply\n"
                "- Code patterns to follow or avoid\n"
                "- Docker/Kubernetes settings to configure\n"
                "- Pipeline steps to include\n\n"
                "Skip generic advice. Only include team-specific standards.\n\n"
                "Return valid JSON:\n"
                '{"action_items": [{"action": "...", "category": "..."}], '
                '"relevance_score": 85, '
                '"key_technologies": ["Serilog", "Polly", ...]}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Wiki Page: {page_title}\n"
                f"Related categories: {', '.join(categories)}\n\n"
                f"Content:\n{content_truncated}"
            ),
        },
    ]

    raw = await _chat(messages, max_tokens=1500)
    if not raw:
        return {"action_items": [], "relevance_score": 0, "key_technologies": []}

    try:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE)
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        logger.warning("ai_wiki_summary_parse_error", page=page_title)
        return {"action_items": [], "relevance_score": 0, "key_technologies": []}


# ── 3. Migration Plan Generation ───────────────────────────────────────────


async def generate_migration_plan(
    repo_name: str,
    current_version: str,
    target_version: str,
    failing_rules: list[dict[str, Any]],
    passing_rules: list[dict[str, Any]],
    category_scores: list[dict[str, Any]],
) -> dict[str, Any]:
    """AI-generated personalized migration plan with phased approach.

    Returns:
    - phases: ordered list of migration phases with tasks
    - estimated_effort: total effort estimate
    - pr_suggestions: list of suggested PRs to create
    - breaking_changes: list of potential breaking changes to watch for
    """
    rules_summary = "\n".join(
        f"- [{r.get('rule_id', '')}] {r.get('rule_name', '')} ({r.get('severity', '')}): "
        f"{r.get('suggested_fix', r.get('details', ''))[:100]}"
        for r in failing_rules[:25]
    )

    cat_summary = "\n".join(
        f"- {c.get('category', '')}: {c.get('score', 0)}% "
        f"({c.get('passed', 0)} passed, {c.get('failed', 0)} failed)"
        for c in category_scores
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a .NET migration architect. Create a phased migration plan "
                f"for upgrading from {current_version} to {target_version} (C# 14).\n\n"
                "Structure the plan into phases:\n"
                "1. Foundation (SDK, project files, dependencies)\n"
                "2. Code modernization (language features, patterns)\n"
                "3. Infrastructure (Docker, Kubernetes, CI/CD)\n"
                "4. Testing & validation\n\n"
                "For each phase, include specific tasks with effort estimates.\n"
                "Suggest specific PRs that should be created.\n"
                "Flag any breaking changes.\n\n"
                "Return valid JSON:\n"
                '{"phases": [{"name": "...", "description": "...", "order": 1, '
                '"tasks": [{"task": "...", "effort_hours": 2, "rule_ids": ["SDK-001"]}], '
                '"estimated_hours": 8}], '
                '"estimated_total_hours": 24, '
                '"pr_suggestions": [{"title": "...", "description": "...", "files_to_change": ["..."], "phase": 1}], '
                '"breaking_changes": [{"description": "...", "mitigation": "..."}]}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Repository: {repo_name}\n"
                f"Current: {current_version} → Target: {target_version}\n\n"
                f"Category scores:\n{cat_summary}\n\n"
                f"Failing rules:\n{rules_summary}\n\n"
                f"Passing rules count: {len(passing_rules)}\n\n"
                "Generate a detailed, phased migration plan."
            ),
        },
    ]

    raw = await _chat(messages, max_tokens=3000, temperature=0.4)
    if not raw:
        return {
            "phases": [],
            "estimated_total_hours": 0,
            "pr_suggestions": [],
            "breaking_changes": [],
        }

    try:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE)
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        logger.warning("ai_migration_plan_parse_error", raw_length=len(raw))
        return {
            "phases": [],
            "estimated_total_hours": 0,
            "pr_suggestions": [],
            "breaking_changes": [],
            "raw_text": raw[:1000],
        }


# ── 4. Risk Assessment ─────────────────────────────────────────────────────


async def assess_risk(
    repo_name: str,
    current_version: str,
    overall_score: float,
    failing_rules: list[dict[str, Any]],
    category_scores: list[dict[str, Any]],
    complexity: str,
    project_count: int,
) -> dict[str, Any]:
    """AI-powered risk scoring and effort estimation for migration.

    Returns:
    - risk_level: low | medium | high | critical
    - risk_score: 0-100
    - effort_estimate_days: estimated days to complete migration
    - risk_factors: list of key risk factors
    - confidence: 0-100 confidence in the assessment
    """
    cat_summary = "\n".join(
        f"- {c.get('category', '')}: {c.get('score', 0)}%"
        for c in category_scores
    )

    critical_count = sum(1 for r in failing_rules if r.get("severity") == "critical")
    high_count = sum(1 for r in failing_rules if r.get("severity") == "high")

    messages = [
        {
            "role": "system",
            "content": (
                "You are a software migration risk analyst. Assess the risk and effort "
                "of migrating a .NET application to .NET 10 / C# 14.\n\n"
                "Consider:\n"
                "- Number and severity of failing rules\n"
                "- Current .NET version (bigger jumps = more risk)\n"
                "- Project complexity (number of projects, architecture)\n"
                "- Critical areas: security context, container configs, dependencies\n"
                "- Team effort needed based on typical .NET migration experience\n\n"
                "Return valid JSON:\n"
                '{"risk_level": "low|medium|high|critical", '
                '"risk_score": 45, '
                '"effort_estimate_days": 5, '
                '"risk_factors": [{"factor": "...", "impact": "high|medium|low", '
                '"description": "..."}], '
                '"mitigation_suggestions": ["..."], '
                '"confidence": 80}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Repository: {repo_name}\n"
                f"Current version: {current_version}\n"
                f"Overall compliance score: {overall_score}%\n"
                f"Complexity: {complexity}\n"
                f"Number of .csproj projects: {project_count}\n"
                f"Failing rules: {len(failing_rules)} total "
                f"({critical_count} critical, {high_count} high)\n\n"
                f"Category scores:\n{cat_summary}\n\n"
                "Assess the migration risk and estimate effort."
            ),
        },
    ]

    raw = await _chat(messages, max_tokens=1500)
    if not raw:
        # Fallback: rule-based risk calculation
        return _fallback_risk(overall_score, failing_rules, complexity, project_count)

    try:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE)
        result = json.loads(cleaned.strip())
        # Ensure required fields
        result.setdefault("risk_level", "medium")
        result.setdefault("risk_score", 50)
        result.setdefault("effort_estimate_days", 5)
        result.setdefault("risk_factors", [])
        result.setdefault("mitigation_suggestions", [])
        result.setdefault("confidence", 70)
        return result
    except json.JSONDecodeError:
        logger.warning("ai_risk_assessment_parse_error")
        return _fallback_risk(overall_score, failing_rules, complexity, project_count)


def _fallback_risk(
    score: float,
    failing_rules: list[dict[str, Any]],
    complexity: str,
    project_count: int,
) -> dict[str, Any]:
    """Simple rule-based risk calculation when AI is unavailable."""
    critical = sum(1 for r in failing_rules if r.get("severity") == "critical")
    high = sum(1 for r in failing_rules if r.get("severity") == "high")

    risk_score = max(0, min(100, 100 - score + critical * 10 + high * 5))
    if risk_score >= 75:
        risk_level = "critical"
    elif risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 25:
        risk_level = "medium"
    else:
        risk_level = "low"

    base_days = {"simple": 2, "moderate": 5, "complex": 10}.get(complexity, 5)
    effort = base_days + len(failing_rules) * 0.5

    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 1),
        "effort_estimate_days": round(effort, 1),
        "risk_factors": [
            {"factor": "Critical rules", "impact": "high", "description": f"{critical} critical rules failing"},
            {"factor": "High-severity rules", "impact": "medium", "description": f"{high} high-severity rules failing"},
        ],
        "mitigation_suggestions": [
            "Address critical security rules first",
            "Update Docker and Kubernetes configurations",
            "Upgrade NuGet packages incrementally",
        ],
        "confidence": 60,
    }


# ── 5. PR Review ────────────────────────────────────────────────────────────


def _build_fallback_breakdown(result: dict[str, Any]) -> list[dict[str, Any]]:
    """Build a confidence breakdown when the AI doesn't return one.

    Uses the issues found in each review section to estimate point deductions.
    """
    # Story Alignment (20 pts)
    story = result.get("story_match", "unknown")
    if story == "fully_matches":
        s1, d1 = 20, []
    elif story == "partially_matches":
        s1, d1 = 10, [f"Partial story match: {result.get('story_match_details', 'details not provided')[:80]} (-10)"]
    else:
        s1, d1 = 0, [f"Story does not match: {result.get('story_match_details', 'details not provided')[:80]} (-20)"]

    # Acceptance Criteria (25 pts)
    acs = result.get("acceptance_criteria", [])
    total_ac = max(len(acs), 1)
    missing = sum(1 for a in acs if isinstance(a, dict) and a.get("status") == "missing")
    partial = sum(1 for a in acs if isinstance(a, dict) and a.get("status") == "partial")
    pts_per_ac = 25 / total_ac
    ac_deductions = []
    for a in acs:
        if isinstance(a, dict):
            if a.get("status") == "missing":
                ac_deductions.append(f"Missing: {a.get('criterion', '?')[:60]} (-{round(pts_per_ac)})")
            elif a.get("status") == "partial":
                ac_deductions.append(f"Partial: {a.get('criterion', '?')[:60]} (-{round(pts_per_ac / 2)})")
    s2 = max(0, round(25 - missing * pts_per_ac - partial * (pts_per_ac / 2)))

    # Code Quality for story (15 pts)
    cq = result.get("code_quality_issues", [])
    cq_ded = 0
    cq_reasons: list[str] = []
    sev_map = {"high": 5, "medium": 3, "low": 1}
    for issue in cq[:10]:
        if isinstance(issue, dict):
            pts = sev_map.get(issue.get("severity", "medium"), 3)
            cq_ded += pts
            cq_reasons.append(f"{issue.get('issue', '?')[:60]} (-{pts})")
    s3 = max(0, 15 - cq_ded)

    # Business Logic (15 pts)
    bl = result.get("business_logic_issues", [])
    bl_ded = 0
    bl_reasons: list[str] = []
    for issue in bl[:10]:
        if isinstance(issue, dict):
            pts = sev_map.get(issue.get("severity", "medium"), 3)
            bl_ded += pts
            bl_reasons.append(f"{issue.get('issue', '?')[:60]} (-{pts})")
    s4 = max(0, 15 - bl_ded)

    # Implementation Quality (10 pts) — how well the code implements the story
    sv = result.get("standards_violations", [])
    sv_reasons: list[str] = []
    for v in sv[:10]:
        if isinstance(v, dict):
            sv_reasons.append(f"{v.get('violation', '?')[:60]} (-3)")
    s5 = max(0, 10 - len(sv) * 3)

    # Completeness for story (10 pts)
    comp = result.get("completeness", {})
    comp_ded = 0
    comp_reasons: list[str] = []
    if isinstance(comp, dict):
        if not comp.get("has_tests"):
            comp_ded += 5; comp_reasons.append("No tests for story scenarios (-5)")
        if not comp.get("has_docs"):
            comp_ded += 3; comp_reasons.append("No documentation for feature (-3)")
        if not comp.get("has_config_changes"):
            comp_ded += 1; comp_reasons.append("No config changes for story (-1)")
        if not comp.get("has_migrations"):
            comp_ded += 1; comp_reasons.append("No migrations for story (-1)")
    s6 = max(0, 10 - comp_ded)

    # Risk & Security (5 pts)
    risks = result.get("risks", [])
    risk_ded = 0
    risk_reasons: list[str] = []
    for r in risks[:10]:
        if isinstance(r, dict):
            pts = {"high": 3, "medium": 2, "low": 1}.get(r.get("severity", "medium"), 2)
            risk_ded += pts
            risk_reasons.append(f"{r.get('risk', '?')[:60]} (-{pts})")
    s7 = max(0, 5 - risk_ded)

    return [
        {"category": "Story Alignment", "weight": 20, "score": s1, "deductions": d1},
        {"category": "Acceptance Criteria", "weight": 25, "score": s2, "deductions": ac_deductions},
        {"category": "Code Quality", "weight": 15, "score": s3, "deductions": cq_reasons},
        {"category": "Business Logic", "weight": 15, "score": s4, "deductions": bl_reasons},
        {"category": "Implementation Quality", "weight": 10, "score": s5, "deductions": sv_reasons},
        {"category": "Completeness", "weight": 10, "score": s6, "deductions": comp_reasons},
        {"category": "Risk & Security", "weight": 5, "score": s7, "deductions": risk_reasons},
    ]


async def review_pull_request(
    story_description: str,
    acceptance_criteria: str,
    business_logic: str,
    pr_diff: dict[str, str],
    pr_title: str = "",
) -> dict[str, Any]:
    """AI-powered Pull Request review against the linked story.

    Reviews PR changes strictly against the user story description
    and acceptance criteria. All dimensions (code quality, completeness,
    risks, etc.) are evaluated in context of what the story requires.

    Returns structured review with:
    - story_match, acceptance_criteria_review, business_logic_issues,
      code_quality_issues, standards_violations, risks,
      suggestions, verdict, confidence_score, confidence_breakdown
    """
    # Build the diff context (truncate per-file to stay within token limits)
    diff_text = ""
    for fpath, content in list(pr_diff.items())[:15]:
        truncated = content[:2000]
        diff_text += f"\n--- {fpath} ---\n{truncated}\n"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a Senior Software Architect and Code Reviewer.\n"
                "Perform a strict, objective AI-based Pull Request Review.\n\n"
                "YOUR SOLE REFERENCE is the User Story and its Acceptance Criteria.\n"
                "Everything you evaluate — code quality, completeness, risks — MUST be\n"
                "judged in the context of what the story requires. Do NOT apply generic\n"
                "standards or wiki rules. Only the story matters.\n\n"
                "REVIEW OBJECTIVES (all relative to the story):\n"
                "1. Story Alignment — does the PR implement the user story description?\n"
                "2. Acceptance Criteria Validation — mark each AC as ✅ Implemented, "
                "❌ Missing, or ⚠ Partially Implemented\n"
                "3. Business Logic Validation — does the code logic match the story requirements?\n"
                "4. Code Quality (for the story) — is the code that implements the story "
                "clean, readable, well-named, handles errors, logs correctly, handles nulls, "
                "and performs well for the use case described in the story?\n"
                "5. Implementation Quality (for the story) — does the implementation follow "
                "good patterns for the story's requirements? DI, async where needed, "
                "proper error handling, correct architecture for the feature?\n"
                "6. Completeness (for the story) — does the PR include tests for the "
                "story's scenarios, documentation for the feature, necessary config, and migrations?\n"
                "7. Risk Analysis (for the story) — could these changes break existing "
                "behavior, introduce performance issues, or create security gaps for "
                "the feature described in the story?\n\n"
                "CONFIDENCE SCORING:\n"
                "You MUST calculate confidence_score as the SUM of scores from these 7 weighted dimensions:\n"
                "  1. Story Alignment           (max 20 pts) — full story match = 20, partial = 5-15, no match = 0\n"
                "  2. Acceptance Criteria         (max 25 pts) — deduct proportionally for each missing/partial AC\n"
                "  3. Code Quality (for story)    (max 15 pts) — deduct per issue: high=-5, medium=-3, low=-1\n"
                "  4. Business Logic              (max 15 pts) — deduct per issue: high=-5, medium=-3, low=-1\n"
                "  5. Implementation Quality      (max 10 pts) — deduct per violation: -3 each\n"
                "  6. Completeness (for story)    (max 10 pts) — no tests for story=-5, no docs=-3, no config=-1, no migrations=-1\n"
                "  7. Risk & Security             (max  5 pts) — deduct per risk: high=-3, medium=-2, low=-1\n"
                "Total = sum of all dimension scores (0-100). Clamp each dimension to min 0.\n\n"
                "For EACH dimension, provide:\n"
                "  - category: dimension name (exactly as listed above)\n"
                "  - weight: max possible points\n"
                "  - score: points awarded after deductions (0..weight)\n"
                "  - deductions: array of strings explaining each specific point loss\n"
                "If a dimension has no issues, deductions should be an empty array and score = weight.\n\n"
                "IMPORTANT RULES:\n"
                "- ONLY judge the PR against the provided User Story and Acceptance Criteria\n"
                "- Do NOT evaluate against external coding standards or wiki rules\n"
                "- Be strict and objective\n"
                "- For EVERY issue, provide the exact file path, line number (or range), and method/function name\n"
                "- For EVERY issue, provide a concrete suggested_fix — actual code or precise instruction to resolve it\n"
                "- Do not hallucinate missing information\n"
                "- If something cannot be verified from the story, state it explicitly\n"
                "- Every point deducted MUST have a specific deduction reason tied to the story\n\n"
                "Return valid JSON with this exact structure:\n"
                "{\n"
                '  "story_match": "fully_matches|partially_matches|does_not_match",\n'
                '  "story_match_details": "...",\n'
                '  "acceptance_criteria": [\n'
                '    {"criterion": "...", "status": "implemented|missing|partial", "details": "..."}\n'
                "  ],\n"
                '  "business_logic_issues": [\n'
                '    {"issue": "...", "severity": "high|medium|low", "file": "path/to/file.py", "line": 42, "method": "function_or_class_name", "details": "...", "suggested_fix": "concrete code or instruction to fix"}\n'
                "  ],\n"
                '  "code_quality_issues": [\n'
                '    {"issue": "...", "severity": "high|medium|low", "file": "path/to/file.py", "line": 42, "method": "function_or_class_name", "details": "...", "suggested_fix": "concrete code or instruction to fix"}\n'
                "  ],\n"
                '  "standards_violations": [\n'
                '    {"violation": "...", "standard": "story requirement", "severity": "high|medium|low", "file": "path/to/file.py", "line": 42, "method": "function_or_class_name", "details": "...", "suggested_fix": "concrete code or instruction to fix"}\n'
                "  ],\n"
                '  "risks": [\n'
                '    {"risk": "...", "type": "breaking|performance|security|edge_case", "severity": "high|medium|low", "file": "path/to/file.py", "line": 42, "method": "function_or_class_name", "details": "...", "suggested_fix": "concrete code or instruction to mitigate"}\n'
                "  ],\n"
                '  "completeness": {\n'
                '    "has_tests": true|false,\n'
                '    "has_docs": true|false,\n'
                '    "has_config_changes": true|false,\n'
                '    "has_migrations": true|false,\n'
                '    "notes": "..."\n'
                "  },\n"
                '  "suggestions": [\n'
                '    {"suggestion": "...", "priority": "high|medium|low", "category": "...", "file": "path/to/file.py", "line": 42, "method": "function_or_class_name", "code_suggestion": "actual code snippet to add or change"}\n'
                "  ],\n"
                '  "confidence_breakdown": [\n'
                '    {"category": "Story Alignment", "weight": 20, "score": 20, "deductions": []},\n'
                '    {"category": "Acceptance Criteria", "weight": 25, "score": 15, "deductions": ["AC-2 missing: user notification not implemented per story (-5)", "AC-5 partial: edge case from AC not handled (-5)"]},\n'
                '    {"category": "Code Quality", "weight": 15, "score": 12, "deductions": ["Missing null check for story input in UserService.cs:42 (-3)"]},\n'
                '    {"category": "Business Logic", "weight": 15, "score": 15, "deductions": []},\n'
                '    {"category": "Implementation Quality", "weight": 10, "score": 7, "deductions": ["Story requires async data fetch but sync used in repo call (-3)"]},\n'
                '    {"category": "Completeness", "weight": 10, "score": 2, "deductions": ["No tests for story scenarios (-5)", "No docs for new feature (-3)"]},\n'
                '    {"category": "Risk & Security", "weight": 5, "score": 3, "deductions": ["Story\'s new endpoint has no auth check (-2)"]}\n'
                "  ],\n"
                '  "verdict": "APPROVE|NEEDS_CHANGES|BLOCK",\n'
                '  "confidence_score": 74,\n'
                '  "summary": "..."\n'
                "}\n\n"
                "CRITICAL: confidence_score MUST equal the sum of all score values in confidence_breakdown.\n"
                "Every deduction string MUST include the points lost in parentheses, e.g. '(-3)'.\n"
                "Every deduction MUST reference which part of the story or AC it relates to."
            ),
        },
        {
            "role": "user",
            "content": (
                f"## Pull Request: {pr_title}\n\n"
                f"### User Story Description:\n{story_description}\n\n"
                f"### Acceptance Criteria:\n{acceptance_criteria}\n\n"
                f"### Business Logic (from story):\n{business_logic}\n\n"
                f"### Pull Request Code Changes:\n{diff_text}\n\n"
                "Review this PR strictly against the User Story and Acceptance Criteria above.\n"
                "Judge code quality, completeness, risks, and implementation quality only "
                "in the context of what the story requires."
            ),
        },
    ]

    raw = await _chat(messages, max_tokens=4000, temperature=0.2)
    if not raw:
        return {
            "story_match": "unknown",
            "story_match_details": "AI service unavailable",
            "acceptance_criteria": [],
            "business_logic_issues": [],
            "code_quality_issues": [],
            "standards_violations": [],
            "risks": [],
            "completeness": {},
            "suggestions": [],
            "verdict": "NEEDS_CHANGES",
            "confidence_score": 0,
            "summary": "AI review could not be performed — Azure OpenAI unavailable.",
        }

    try:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE)
        result = json.loads(cleaned.strip())
        # Ensure required fields
        result.setdefault("story_match", "unknown")
        result.setdefault("verdict", "NEEDS_CHANGES")
        result.setdefault("summary", "")

        # ── Validate and reconcile confidence breakdown ──
        breakdown = result.get("confidence_breakdown", [])
        if isinstance(breakdown, list) and len(breakdown) > 0:
            # Clamp each dimension score to [0, weight]
            for dim in breakdown:
                if isinstance(dim, dict):
                    w = dim.get("weight", 0)
                    s = dim.get("score", 0)
                    dim["score"] = max(0, min(w, s))
                    if not isinstance(dim.get("deductions"), list):
                        dim["deductions"] = []
            # Recalculate confidence_score as sum of breakdown scores (ground truth)
            result["confidence_score"] = sum(
                dim.get("score", 0) for dim in breakdown if isinstance(dim, dict)
            )
            result["confidence_breakdown"] = breakdown
        else:
            # AI didn't return a breakdown — build one from the other fields
            result["confidence_breakdown"] = _build_fallback_breakdown(result)
            result["confidence_score"] = sum(
                dim["score"] for dim in result["confidence_breakdown"]
            )

        result["confidence_score"] = max(0, min(100, result["confidence_score"]))
        return result
    except json.JSONDecodeError:
        logger.warning("ai_pr_review_parse_error", raw_length=len(raw))
        return {
            "story_match": "unknown",
            "story_match_details": "",
            "acceptance_criteria": [],
            "business_logic_issues": [],
            "code_quality_issues": [],
            "standards_violations": [],
            "risks": [],
            "completeness": {},
            "suggestions": [],
            "verdict": "NEEDS_CHANGES",
            "confidence_score": 0,
            "summary": raw[:1500],
        }


# ── Health check ────────────────────────────────────────────────────────────


async def check_ai_health() -> dict[str, Any]:
    """Verify Azure OpenAI connectivity."""
    client = _get_client()
    if not client:
        return {"status": "not_configured", "model": "", "message": "Azure OpenAI not configured"}

    settings = get_settings()
    try:
        response = await client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5,
        )
        model = response.model or settings.azure_openai_deployment
        return {"status": "healthy", "model": model, "message": "Connected to Azure OpenAI"}
    except Exception as e:
        return {"status": "error", "model": "", "message": str(e)[:200]}


# ── 6. AI Code Fix Generation for Auto-Fix Pipeline ────────────────────────


async def generate_code_fixes(
    repo_name: str,
    failing_rules: list[dict[str, Any]],
    file_contents: dict[str, str],
) -> dict[str, str]:
    """Generate AI code fixes for failing compliance rules.

    Groups failing rules by the file they affect, then asks GPT to produce
    corrected file content for each affected file.

    Args:
        repo_name: repository name for context
        failing_rules: list of dicts with rule_id, rule_name, details, severity,
                       file_path, suggested_fix, category
        file_contents: dict of {file_path: current_content} for files that need fixing

    Returns:
        dict of {file_path: corrected_content} for successfully fixed files
    """
    if not failing_rules or not file_contents:
        return {}

    # Group rules by file path
    rules_by_file: dict[str, list[dict[str, Any]]] = {}
    for rule in failing_rules:
        fp = rule.get("file_path", "")
        if fp and fp in file_contents:
            rules_by_file.setdefault(fp, []).append(rule)

    # For rules without a specific file, try to assign them to likely files
    for rule in failing_rules:
        fp = rule.get("file_path", "")
        if not fp or fp not in file_contents:
            # Try to infer the file from rule category
            rule_id = rule.get("rule_id", "")
            category = rule.get("category", "")
            assigned = False

            # SDK/Lang/Config rules → .csproj file
            if rule_id.startswith(("SDK-", "LANG-", "CFG-")):
                for f in file_contents:
                    if f.endswith(".csproj"):
                        rules_by_file.setdefault(f, []).append(rule)
                        assigned = True
                        break

            # DEVOPS rules → Dockerfile or pipeline
            if not assigned and rule_id.startswith("DEVOPS-"):
                for f in file_contents:
                    fname = f.rsplit("/", 1)[-1].lower()
                    if fname in ("dockerfile", "azure-pipelines.yml", ".azure-pipelines.yml"):
                        rules_by_file.setdefault(f, []).append(rule)
                        assigned = True
                        break

            # AKS rules → YAML files
            if not assigned and rule_id.startswith("AKS-"):
                for f in file_contents:
                    if f.endswith((".yaml", ".yml")) and "deploy" in f.lower():
                        rules_by_file.setdefault(f, []).append(rule)
                        assigned = True
                        break

    fixes: dict[str, str] = {}

    for file_path, rules in rules_by_file.items():
        current_content = file_contents.get(file_path, "")
        if not current_content:
            continue

        # Build the rules description
        rules_text = "\n".join(
            f"- [{r.get('rule_id', '')}] {r.get('rule_name', '')}: "
            f"{r.get('details', '')} "
            f"(Suggested: {r.get('suggested_fix', 'N/A')})"
            for r in rules
        )

        file_ext = file_path.rsplit(".", 1)[-1] if "." in file_path else "txt"

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert .NET 10 / C# 14 migration engineer. "
                    "You fix compliance issues in code files precisely and minimally. "
                    "Return ONLY the complete corrected file content — no markdown fences, "
                    "no explanations, no comments about what changed. "
                    "Just the raw file content ready to be saved."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Repository: {repo_name}\n"
                    f"File: {file_path}\n\n"
                    f"The following compliance rules are FAILING for this file:\n"
                    f"{rules_text}\n\n"
                    f"Current file content:\n"
                    f"```{file_ext}\n{current_content[:6000]}\n```\n\n"
                    f"Please fix ALL the failing rules above and return the complete "
                    f"corrected file content. Make minimal changes — only fix what's "
                    f"needed for compliance. Preserve all existing functionality."
                ),
            },
        ]

        try:
            fixed_content = await _chat(messages, temperature=0.1, max_tokens=4000)
            if fixed_content:
                # Strip markdown code fences if GPT adds them anyway
                cleaned = fixed_content.strip()
                if cleaned.startswith("```"):
                    # Remove first line (```lang) and last line (```)
                    lines = cleaned.split("\n")
                    if lines[-1].strip() == "```":
                        lines = lines[1:-1]
                    else:
                        lines = lines[1:]
                    cleaned = "\n".join(lines)

                if cleaned and len(cleaned) > 10:
                    fixes[file_path] = cleaned
                    logger.info(
                        "code_fix_generated",
                        file=file_path,
                        rules_fixed=len(rules),
                        original_len=len(current_content),
                        fixed_len=len(cleaned),
                    )
                else:
                    logger.warning("code_fix_too_short", file=file_path)
            else:
                logger.warning("code_fix_empty", file=file_path)
        except Exception as e:
            logger.error("code_fix_failed", file=file_path, error=str(e))
            continue

    return fixes
