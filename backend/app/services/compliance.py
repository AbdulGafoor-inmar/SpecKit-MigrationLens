"""Compliance rule engine — evaluates repos against YAML-defined rules."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml
import structlog

from app.models.enums import ComplianceStatus, Severity
from app.models.schemas import CategoryScore, ComplianceResult

logger = structlog.get_logger()

RULES_PATH = Path(__file__).parent.parent / "rules" / "compliance-rules.yaml"


class ComplianceEngine:
    """Evaluates repository files against compliance rules."""

    def __init__(self):
        self._rules = self._load_rules()

    def _load_rules(self) -> list[dict[str, Any]]:
        """Load compliance rules from YAML."""
        with open(RULES_PATH, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("categories", [])

    def evaluate(
        self,
        csproj_files: list[tuple[str, str]],
        cs_files: list[tuple[str, str]],
        file_list: list[str],
        extra_files: dict[str, str] | None = None,
        app_type: str = "api",
    ) -> tuple[list[ComplianceResult], list[CategoryScore]]:
        """
        Evaluate all rules against repository contents.

        Args:
            csproj_files: List of (file_path, content) tuples for .csproj files
            cs_files: List of (file_path, content) tuples for .cs files
            file_list: List of all file paths in the repo
            extra_files: Mapping of specific file names to their content
            app_type: Detected application type (api, cronjob, worker, library)

        Returns:
            Tuple of (individual results, category scores)
        """
        extra_files = extra_files or {}
        all_results: list[ComplianceResult] = []

        for category in self._rules:
            cat_name = category["name"]
            for rule in category.get("rules", []):
                # Filter by applies_to — skip rules not applicable to this app type
                applies_to = rule.get("applies_to", None)
                if applies_to is not None:
                    # applies_to is a list like ["api"] or ["cronjob"]
                    if app_type not in applies_to:
                        # Mark as N/A — rule doesn't apply to this app type
                        all_results.append(
                            ComplianceResult(
                                rule_id=rule["id"],
                                rule_name=rule["name"],
                                category=cat_name,
                                status=ComplianceStatus.NA,
                                severity=Severity(rule.get("severity", "medium")),
                                details=f"Not applicable to {app_type} applications",
                            )
                        )
                        continue

                result = self._evaluate_rule(
                    rule, cat_name, csproj_files, cs_files, file_list, extra_files
                )
                all_results.append(result)

        category_scores = self._compute_category_scores(all_results)
        return all_results, category_scores

    def _find_line_number(self, content: str, pattern: str, flags: int = 0) -> tuple[int | None, str]:
        """Find the line number and matching text for a pattern in content."""
        match = re.search(pattern, content, flags)
        if not match:
            return None, ""
        # Count lines up to match start
        line_num = content[:match.start()].count('\n') + 1
        # Get the full line containing the match
        lines = content.split('\n')
        if 0 < line_num <= len(lines):
            return line_num, lines[line_num - 1].strip()
        return line_num, match.group(0).strip()

    def _evaluate_rule(
        self,
        rule: dict[str, Any],
        category: str,
        csproj_files: list[tuple[str, str]],
        cs_files: list[tuple[str, str]],
        file_list: list[str],
        extra_files: dict[str, str],
    ) -> ComplianceResult:
        """Evaluate a single compliance rule, tracking file path and line number."""
        rule_id = rule["id"]
        check_type = rule.get("check_type", "")
        pattern = rule.get("pattern", "")
        fail_message = rule.get("fail_message", "")
        migration_guide = rule.get("migration_guide", "")
        suggested_fix = rule.get("suggested_fix", "")
        rule_description = rule.get("description", rule.get("name", ""))

        status = ComplianceStatus.NA
        details = ""
        found_file_path: str | None = None
        found_line_number: int | None = None
        found_current_code: str = ""

        try:
            if check_type == "csproj_contains":
                if not csproj_files:
                    status = ComplianceStatus.NA
                    details = "No .csproj files found"
                else:
                    found = False
                    for fpath, content in csproj_files:
                        if re.search(pattern, content, re.IGNORECASE):
                            found = True
                            line_num, line_text = self._find_line_number(content, pattern, re.IGNORECASE)
                            found_file_path = fpath
                            found_line_number = line_num
                            found_current_code = line_text
                            break
                    status = ComplianceStatus.PASS if found else ComplianceStatus.FAIL
                    if found:
                        details = f"Verified — {rule_description}"
                    else:
                        details = fail_message
                        # Point to the first csproj as the file to modify
                        found_file_path = csproj_files[0][0]

            elif check_type == "csproj_not_contains":
                if not csproj_files:
                    status = ComplianceStatus.NA
                    details = "No .csproj files found"
                else:
                    found = False
                    for fpath, content in csproj_files:
                        if re.search(pattern, content, re.IGNORECASE):
                            found = True
                            line_num, line_text = self._find_line_number(content, pattern, re.IGNORECASE)
                            found_file_path = fpath
                            found_line_number = line_num
                            found_current_code = line_text
                            break
                    status = ComplianceStatus.FAIL if found else ComplianceStatus.PASS
                    if found:
                        details = fail_message
                    else:
                        details = f"Verified — {rule_description}"

            elif check_type == "file_exists":
                patterns = pattern.split("|")
                found = any(
                    any(p.lower() in f.lower() for f in file_list) for p in patterns
                )
                status = ComplianceStatus.PASS if found else ComplianceStatus.FAIL
                details = f"Verified — {rule_description}" if found else fail_message

            elif check_type == "cs_pattern":
                if not cs_files:
                    status = ComplianceStatus.NA
                    details = "No .cs files found"
                else:
                    found = False
                    for fpath, content in cs_files:
                        if re.search(pattern, content, re.MULTILINE):
                            found = True
                            line_num, line_text = self._find_line_number(content, pattern, re.MULTILINE)
                            found_file_path = fpath
                            found_line_number = line_num
                            found_current_code = line_text
                            break
                    status = ComplianceStatus.PASS if found else ComplianceStatus.FAIL
                    if found:
                        details = f"Verified — {rule_description}"
                    else:
                        details = fail_message
                        found_file_path = cs_files[0][0]

            elif check_type == "file_contains":
                target_file = rule.get("file", "")
                # Try exact match first, then fuzzy match (e.g. "deployment.yaml" matches "api-deployment.yaml")
                content = extra_files.get(target_file, "")
                if not content:
                    for key, val in extra_files.items():
                        if target_file.lower() in key.lower():
                            content = val
                            break
                if not content:
                    file_found = any(target_file.lower() in f.lower() for f in file_list)
                    if not file_found:
                        status = ComplianceStatus.NA
                        details = f"File {target_file} not found"
                    else:
                        status = ComplianceStatus.FAIL
                        details = fail_message
                        # Find the file path
                        matching = [f for f in file_list if target_file.lower() in f.lower()]
                        if matching:
                            found_file_path = matching[0]
                else:
                    match_found = bool(re.search(pattern, content, re.IGNORECASE))
                    status = ComplianceStatus.PASS if match_found else ComplianceStatus.FAIL
                    if match_found:
                        line_num, line_text = self._find_line_number(content, pattern, re.IGNORECASE)
                        found_line_number = line_num
                        found_current_code = line_text
                        details = f"Verified — {rule_description}"
                    else:
                        details = fail_message
                    # Find the file path
                    matching = [f for f in file_list if target_file.lower() in f.lower()]
                    if matching:
                        found_file_path = matching[0]
            else:
                status = ComplianceStatus.NA
                details = f"Unknown check type: {check_type}"

        except re.error as e:
            logger.error("regex_error", rule_id=rule_id, pattern=pattern, error=str(e))
            status = ComplianceStatus.NA
            details = f"Regex error in rule: {e}"

        return ComplianceResult(
            rule_id=rule_id,
            rule_name=rule["name"],
            category=category,
            status=status,
            severity=Severity(rule.get("severity", "medium")),
            details=details,
            file_path=found_file_path,
            line_number=found_line_number,
            current_code=found_current_code,
            suggested_fix=suggested_fix if status == ComplianceStatus.FAIL else "",
            migration_guide=migration_guide if status == ComplianceStatus.FAIL else "",
        )

    def _compute_category_scores(
        self, results: list[ComplianceResult]
    ) -> list[CategoryScore]:
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
            total = counts["passed"] + counts["failed"] + counts["na"]
            evaluated = counts["passed"] + counts["failed"]
            score = (counts["passed"] / evaluated * 100) if evaluated > 0 else 0.0

            scores.append(
                CategoryScore(
                    category=cat_name,
                    score=round(score, 1),
                    total_rules=total,
                    passed=counts["passed"],
                    failed=counts["failed"],
                    not_applicable=counts["na"],
                )
            )

        return scores

    @staticmethod
    def compute_overall_score(category_scores: list[CategoryScore]) -> float:
        """Compute overall score as average of category scores (excluding all-NA categories)."""
        valid_scores = [cs.score for cs in category_scores if (cs.passed + cs.failed) > 0]
        if not valid_scores:
            return 0.0
        return round(sum(valid_scores) / len(valid_scores), 1)
