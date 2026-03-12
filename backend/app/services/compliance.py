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
        csproj_contents: list[str],
        cs_contents: list[str],
        file_list: list[str],
        extra_files: dict[str, str] | None = None,
    ) -> tuple[list[ComplianceResult], list[CategoryScore]]:
        """
        Evaluate all rules against repository contents.

        Args:
            csproj_contents: List of .csproj file contents
            cs_contents: List of .cs file contents
            file_list: List of all file paths in the repo
            extra_files: Mapping of specific file names to their content

        Returns:
            Tuple of (individual results, category scores)
        """
        extra_files = extra_files or {}
        all_results: list[ComplianceResult] = []

        for category in self._rules:
            cat_name = category["name"]
            for rule in category.get("rules", []):
                result = self._evaluate_rule(
                    rule, cat_name, csproj_contents, cs_contents, file_list, extra_files
                )
                all_results.append(result)

        category_scores = self._compute_category_scores(all_results)
        return all_results, category_scores

    def _evaluate_rule(
        self,
        rule: dict[str, Any],
        category: str,
        csproj_contents: list[str],
        cs_contents: list[str],
        file_list: list[str],
        extra_files: dict[str, str],
    ) -> ComplianceResult:
        """Evaluate a single compliance rule."""
        rule_id = rule["id"]
        check_type = rule.get("check_type", "")
        pattern = rule.get("pattern", "")
        fail_message = rule.get("fail_message", "")

        status = ComplianceStatus.NA
        details = ""

        try:
            if check_type == "csproj_contains":
                if not csproj_contents:
                    status = ComplianceStatus.NA
                    details = "No .csproj files found"
                else:
                    found = any(
                        re.search(pattern, content, re.IGNORECASE)
                        for content in csproj_contents
                    )
                    status = ComplianceStatus.PASS if found else ComplianceStatus.FAIL
                    details = "" if found else fail_message

            elif check_type == "csproj_not_contains":
                if not csproj_contents:
                    status = ComplianceStatus.NA
                    details = "No .csproj files found"
                else:
                    found = any(
                        re.search(pattern, content, re.IGNORECASE)
                        for content in csproj_contents
                    )
                    status = ComplianceStatus.FAIL if found else ComplianceStatus.PASS
                    details = fail_message if found else ""

            elif check_type == "file_exists":
                patterns = pattern.split("|")
                found = any(
                    any(p.lower() in f.lower() for f in file_list) for p in patterns
                )
                status = ComplianceStatus.PASS if found else ComplianceStatus.FAIL
                details = "" if found else fail_message

            elif check_type == "cs_pattern":
                if not cs_contents:
                    status = ComplianceStatus.NA
                    details = "No .cs files found"
                else:
                    found = any(
                        re.search(pattern, content, re.MULTILINE)
                        for content in cs_contents
                    )
                    status = ComplianceStatus.PASS if found else ComplianceStatus.FAIL
                    details = "" if found else fail_message

            elif check_type == "file_contains":
                target_file = rule.get("file", "")
                content = extra_files.get(target_file, "")
                if not content:
                    # Check if the file exists at all
                    file_found = any(target_file.lower() in f.lower() for f in file_list)
                    if not file_found:
                        status = ComplianceStatus.NA
                        details = f"File {target_file} not found"
                    else:
                        status = ComplianceStatus.FAIL
                        details = fail_message
                else:
                    found = bool(re.search(pattern, content, re.IGNORECASE))
                    status = ComplianceStatus.PASS if found else ComplianceStatus.FAIL
                    details = "" if found else fail_message
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
