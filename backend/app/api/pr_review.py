"""PR Review endpoints — list PRs, run AI review, post comments."""

from __future__ import annotations

import re
from fastapi import APIRouter, HTTPException, Path, Query

from app.config import get_settings
from app.models.schemas import (
    PRAcceptanceCriterionResult,
    PRBusinessLogicIssue,
    PRCodeQualityIssue,
    PRCompleteness,
    PRConfidenceBreakdown,
    PRLinkedWorkItem,
    PRReviewResult,
    PRRisk,
    PRStandardsViolation,
    PRSuggestion,
    PullRequestInfo,
)
from app.services.ado_client import ADOClient
from app.services import ai_service
from app.services.cache import mem_get, mem_set

router = APIRouter()


def _parse_pr(pr: dict, repo_id: str = "", repo_name: str = "") -> PullRequestInfo:
    """Convert raw ADO PR dict to PullRequestInfo."""
    created_by = pr.get("createdBy", {})
    repo = pr.get("repository", {})
    pr_id = pr.get("pullRequestId", 0)

    # Build a proper web-portal URL using project + repo names
    r_name = repo_name or repo.get("name", "")
    p_name = repo.get("project", {}).get("name", "")
    settings = get_settings()
    org = settings.ado_organization
    if p_name and r_name:
        web_url = f"https://dev.azure.com/{org}/{p_name}/_git/{r_name}/pullrequest/{pr_id}"
    else:
        # Fallback: rewrite the API URL as best we can
        web_url = pr.get("url", "").replace("_apis/git/repositories", "_git").replace(
            f"/pullrequests/{pr_id}", f"/pullrequest/{pr_id}"
        )

    return PullRequestInfo(
        pr_id=pr_id,
        title=pr.get("title", ""),
        description=pr.get("description", ""),
        status=pr.get("status", ""),
        source_branch=pr.get("sourceRefName", "").replace("refs/heads/", ""),
        target_branch=pr.get("targetRefName", "").replace("refs/heads/", ""),
        created_by=created_by.get("displayName", created_by.get("uniqueName", "")),
        creation_date=pr.get("creationDate", ""),
        url=web_url,
        repo_id=repo_id or repo.get("id", ""),
        repo_name=r_name,
    )


@router.get("/repos/{repo_id}/pull-requests", response_model=list[PullRequestInfo])
async def list_pull_requests(
    repo_id: str = Path(..., description="Repository ID"),
    status: str = Query("all", description="PR status: active, completed, abandoned, all"),
    project: str = Query("", description="ADO project name"),
) -> list[PullRequestInfo]:
    """List pull requests for a repository."""
    settings = get_settings()
    proj = project or settings.ado_project
    client = ADOClient()

    prs = await client.list_pull_requests(proj, repo_id, status=status)
    return [_parse_pr(pr, repo_id) for pr in prs]


@router.get(
    "/repos/{repo_id}/pull-requests/{pr_id}/review",
    response_model=PRReviewResult,
)
async def review_pull_request(
    repo_id: str = Path(..., description="Repository ID"),
    pr_id: int = Path(..., description="Pull Request ID"),
    project: str = Query("", description="ADO project name"),
) -> PRReviewResult:
    """Run an AI-powered review on a pull request.

    Fetches PR diff and linked work items (story description + acceptance
    criteria), then sends everything to Azure OpenAI for a structured
    review strictly against the story requirements.
    """
    import traceback as tb

    settings = get_settings()
    proj = project or settings.ado_project
    client = ADOClient()

    try:
        # 1. Get PR details
        pr_raw = await client.get_pull_request(proj, repo_id, pr_id)
        if not pr_raw:
            raise HTTPException(status_code=404, detail="Pull request not found")

        pr_info = _parse_pr(pr_raw, repo_id)

        # 2. Get PR diff (changed files content)
        diff = await client.get_pr_diff(proj, repo_id, pr_id)
        files_changed = list(diff.keys())

        # 3. Get linked work items (story, acceptance criteria)
        work_items_raw = await client.get_pr_work_items(proj, repo_id, pr_id)
        linked_items: list[PRLinkedWorkItem] = []
        story_description = ""
        acceptance_criteria = ""
        business_logic = ""

        for wi in work_items_raw:
            fields = wi.get("fields", {})
            wi_type = fields.get("System.WorkItemType", "")
            title = fields.get("System.Title", "")
            desc = fields.get("System.Description", "") or ""
            ac = fields.get("Microsoft.VSTS.Common.AcceptanceCriteria", "") or ""

            wi_id = wi.get("id", 0)
            wi_url = wi.get("_links", {}).get("html", {}).get("href", "")
            if not wi_url and wi_id:
                wi_url = f"https://dev.azure.com/{settings.ado_organization}/{proj}/_workitems/edit/{wi_id}"

            linked_items.append(PRLinkedWorkItem(
                id=wi_id,
                title=title,
                description=_strip_html(desc),
                acceptance_criteria=_strip_html(ac),
                work_item_type=wi_type,
                state=fields.get("System.State", ""),
                url=wi_url,
            ))

            # Use the first User Story / Bug / Task for the review context
            if wi_type in ("User Story", "Bug", "Product Backlog Item", "Task") and not story_description:
                story_description = _strip_html(desc) or title
                acceptance_criteria = _strip_html(ac)
                business_logic = f"{_strip_html(desc)}\n\nAcceptance Criteria:\n{_strip_html(ac)}"

        if not story_description and linked_items:
            story_description = linked_items[0].description or linked_items[0].title
            acceptance_criteria = linked_items[0].acceptance_criteria
            business_logic = story_description

        # 4. Run AI review (story-driven — no wiki standards)
        review_raw = await ai_service.review_pull_request(
            story_description=story_description or pr_info.title,
            acceptance_criteria=acceptance_criteria or "Not provided in linked work item",
            business_logic=business_logic or "Not provided — review code against PR description",
            pr_diff=diff,
            pr_title=pr_info.title,
        )

        # 6. Parse AI response into typed models (with lenient error handling)
        def _safe_parse(model_cls, items_key):
            result = []
            for item in review_raw.get(items_key, []):
                if not isinstance(item, dict):
                    continue
                try:
                    known = set(model_cls.model_fields.keys())
                    filtered = {k: v for k, v in item.items() if k in known}
                    result.append(model_cls(**filtered))
                except Exception:
                    pass
            return result

        ac_results = _safe_parse(PRAcceptanceCriterionResult, "acceptance_criteria")
        biz_issues = _safe_parse(PRBusinessLogicIssue, "business_logic_issues")
        code_issues = _safe_parse(PRCodeQualityIssue, "code_quality_issues")
        std_violations = _safe_parse(PRStandardsViolation, "standards_violations")
        risks = _safe_parse(PRRisk, "risks")
        suggestions = _safe_parse(PRSuggestion, "suggestions")

        completeness_raw = review_raw.get("completeness", {})
        try:
            completeness = PRCompleteness(**completeness_raw) if isinstance(completeness_raw, dict) else PRCompleteness()
        except Exception:
            completeness = PRCompleteness()

        # Parse confidence breakdown
        confidence_breakdown = _safe_parse(PRConfidenceBreakdown, "confidence_breakdown")

        return PRReviewResult(
            pr=pr_info,
            linked_work_items=linked_items,
            story_match=review_raw.get("story_match", "unknown"),
            story_match_details=review_raw.get("story_match_details", ""),
            acceptance_criteria=ac_results,
            business_logic_issues=biz_issues,
            code_quality_issues=code_issues,
            standards_violations=std_violations,
            risks=risks,
            completeness=completeness,
            suggestions=suggestions,
            verdict=review_raw.get("verdict", "NEEDS_CHANGES"),
            confidence_score=review_raw.get("confidence_score", 0),
            confidence_breakdown=confidence_breakdown,
            summary=review_raw.get("summary", ""),
            files_changed=files_changed,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PR review failed: {str(e)}\n{tb.format_exc()}")


@router.post("/repos/{repo_id}/pull-requests/{pr_id}/comment")
async def post_review_comment(
    repo_id: str = Path(..., description="Repository ID"),
    pr_id: int = Path(..., description="Pull Request ID"),
    project: str = Query("", description="ADO project name"),
    review: PRReviewResult | None = None,
) -> dict:
    """Post the AI review as a comment on the ADO pull request."""
    settings = get_settings()
    proj = project or settings.ado_project
    client = ADOClient()

    # Build a markdown comment from the review
    if not review:
        return {"error": "No review data provided"}

    comment = _build_review_comment(review)
    result = await client.post_pr_comment(proj, repo_id, pr_id, comment)

    if result:
        return {"status": "posted", "thread_id": result.get("id", 0)}
    raise HTTPException(status_code=500, detail="Failed to post comment to ADO")


def _strip_html(html: str) -> str:
    """Remove HTML tags from a string."""
    if not html:
        return ""
    clean = re.sub(r"<[^>]+>", "", html)
    clean = clean.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return clean.strip()


def _build_review_comment(review: PRReviewResult) -> str:
    """Build a formatted markdown comment for ADO from the review result."""
    verdict_emoji = {"APPROVE": "✅", "NEEDS_CHANGES": "⚠️", "BLOCK": "🛑"}.get(
        review.verdict, "⚠️"
    )
    story_emoji = {
        "fully_matches": "✔",
        "partially_matches": "⚠",
        "does_not_match": "✖",
    }.get(review.story_match, "?")

    lines = [
        f"## 🤖 AI PR Review — {verdict_emoji} {review.verdict}",
        f"**Confidence:** {review.confidence_score}%\n",
    ]

    # Confidence breakdown table
    if review.confidence_breakdown:
        lines.append("### Confidence Breakdown")
        lines.append("| Dimension | Score | Lost | Details |")
        lines.append("|---|---|---|---|")
        for dim in review.confidence_breakdown:
            lost = dim.weight - dim.score
            deduction_text = "; ".join(dim.deductions[:3]) if dim.deductions else "—"
            bar = "█" * dim.score + "░" * lost
            lines.append(f"| {dim.category} | {bar} {dim.score}/{dim.weight} | -{lost} | {deduction_text} |")
        lines.append("")

    lines.extend([
        f"### Story Alignment: {story_emoji}",
        review.story_match_details or "",
        "",
    ])

    if review.acceptance_criteria:
        lines.append("### Acceptance Criteria")
        for ac in review.acceptance_criteria:
            icon = {"implemented": "✅", "missing": "❌", "partial": "⚠️"}.get(ac.status, "❓")
            lines.append(f"- {icon} {ac.criterion}")
            if ac.details:
                lines.append(f"  > {ac.details}")
        lines.append("")

    if review.code_quality_issues:
        lines.append("### Code Quality Issues")
        for issue in review.code_quality_issues:
            lines.append(f"- **[{issue.severity.upper()}]** {issue.issue}")
            loc_parts = []
            if issue.file:
                loc_parts.append(f"`{issue.file}`")
            if issue.line:
                loc_parts.append(f"L{issue.line}")
            if issue.method:
                loc_parts.append(f"→ `{issue.method}`")
            if loc_parts:
                lines.append(f"  📄 {' '.join(loc_parts)}")
            if issue.details:
                lines.append(f"  > {issue.details}")
            if issue.suggested_fix:
                lines.append(f"  💡 **Suggested Fix:**")
                lines.append(f"  ```")
                lines.append(f"  {issue.suggested_fix}")
                lines.append(f"  ```")
        lines.append("")

    if review.business_logic_issues:
        lines.append("### Business Logic Issues")
        for issue in review.business_logic_issues:
            lines.append(f"- **[{issue.severity.upper()}]** {issue.issue}")
            loc_parts = []
            if issue.file:
                loc_parts.append(f"`{issue.file}`")
            if issue.line:
                loc_parts.append(f"L{issue.line}")
            if issue.method:
                loc_parts.append(f"→ `{issue.method}`")
            if loc_parts:
                lines.append(f"  📄 {' '.join(loc_parts)}")
            if issue.details:
                lines.append(f"  > {issue.details}")
            if issue.suggested_fix:
                lines.append(f"  💡 **Suggested Fix:**")
                lines.append(f"  ```")
                lines.append(f"  {issue.suggested_fix}")
                lines.append(f"  ```")
        lines.append("")

    if review.standards_violations:
        lines.append("### Implementation Issues")
        for v in review.standards_violations:
            lines.append(f"- **{v.violation}** ({v.standard})")
            loc_parts = []
            if v.file:
                loc_parts.append(f"`{v.file}`")
            if v.line:
                loc_parts.append(f"L{v.line}")
            if v.method:
                loc_parts.append(f"→ `{v.method}`")
            if loc_parts:
                lines.append(f"  📄 {' '.join(loc_parts)}")
            if v.details:
                lines.append(f"  > {v.details}")
            if v.suggested_fix:
                lines.append(f"  💡 **Suggested Fix:**")
                lines.append(f"  ```")
                lines.append(f"  {v.suggested_fix}")
                lines.append(f"  ```")
        lines.append("")

    if review.risks:
        lines.append("### Risks")
        for risk in review.risks:
            lines.append(f"- **[{risk.type.upper()}]** {risk.risk} ({risk.severity})")
            loc_parts = []
            if risk.file:
                loc_parts.append(f"`{risk.file}`")
            if risk.line:
                loc_parts.append(f"L{risk.line}")
            if risk.method:
                loc_parts.append(f"→ `{risk.method}`")
            if loc_parts:
                lines.append(f"  📄 {' '.join(loc_parts)}")
            if risk.details:
                lines.append(f"  > {risk.details}")
            if risk.suggested_fix:
                lines.append(f"  💡 **Mitigation:**")
                lines.append(f"  ```")
                lines.append(f"  {risk.suggested_fix}")
                lines.append(f"  ```")
        lines.append("")

    if review.suggestions:
        lines.append("### Suggestions")
        for s in review.suggestions:
            lines.append(f"- [{s.priority.upper()}] {s.suggestion}")
            loc_parts = []
            if s.file:
                loc_parts.append(f"`{s.file}`")
            if s.line:
                loc_parts.append(f"L{s.line}")
            if s.method:
                loc_parts.append(f"→ `{s.method}`")
            if loc_parts:
                lines.append(f"  📄 {' '.join(loc_parts)}")
            if s.code_suggestion:
                lines.append(f"  💡 **Suggested Code:**")
                lines.append(f"  ```")
                lines.append(f"  {s.code_suggestion}")
                lines.append(f"  ```")
        lines.append("")

    if review.summary:
        lines.append(f"### Summary\n{review.summary}")

    lines.append("\n---\n*Generated by MigrationLens AI Review*")
    return "\n".join(lines)
