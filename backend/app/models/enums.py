"""Enumerations for compliance status and severity."""

from enum import StrEnum


class ComplianceStatus(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    NA = "na"


class Severity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ExportFormat(StrEnum):
    JSON = "json"
    CSV = "csv"


class Complexity(StrEnum):
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
