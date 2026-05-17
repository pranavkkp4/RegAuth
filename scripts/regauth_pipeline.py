"""Shared RegAuth pipeline contracts for CI automation scripts."""

from __future__ import annotations

import json
import re
from fnmatch import fnmatch
from pathlib import Path
from typing import Any


CONTRACT_VERSION = 1
SAFE_SELF_HEAL_CATEGORIES = {
    "Data fixture drift",
    "Environment readiness",
    "Assertion contract drift",
    "Framework lifecycle fault",
}
DEFAULT_SELF_HEAL_TARGET = "src/test/resources/features/regauth/generated-self-heal.feature"
DEFAULT_ALLOWED_PATHS = (
    "src/test/**",
    "features/**",
    "classpath:payloads/**",
    "mocks/**",
)
DEFAULT_DENIED_PATHS = (
    ".github/**",
    "server/**",
    "src/main/**",
    "prod/**",
    "secrets/**",
    ".env",
    ".env.*",
)
SENSITIVE_PATTERNS = (
    (re.compile(r"\b4[0-9]{12}(?:[0-9]{3})?\b"), "[REDACTED_PAN]"),
    (re.compile(r"\b5[1-5][0-9]{14}\b"), "[REDACTED_PAN]"),
    (re.compile(r"\b3[47][0-9]{13}\b"), "[REDACTED_PAN]"),
    (re.compile(r"(?i)\b(api[_-]?key|secret|password|token)\s*[:=]\s*['\"]?[^'\"\s<]+"), r"\1=[REDACTED]"),
    (re.compile(r"(?i)\b(account|acct)[_-]?id\s*[:=]\s*['\"]?[^'\"\s<]+"), r"\1_id=[REDACTED]"),
)


def redact_sensitive(value: str) -> str:
    redacted = value
    for pattern, replacement in SENSITIVE_PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted


def contains_sensitive(value: str) -> bool:
    return any(pattern.search(value) for pattern, _ in SENSITIVE_PATTERNS)


def path_allowed(path: str, allowed: list[str] | tuple[str, ...], denied: list[str] | tuple[str, ...]) -> bool:
    normalized = path.replace("\\", "/").lstrip("./")
    if any(fnmatch(normalized, pattern) for pattern in denied):
        return False
    return any(fnmatch(normalized, pattern) for pattern in allowed)


def report_text(reports: list[Any]) -> str:
    return "\n".join(str(getattr(report, "text", "")) for report in reports)


def report_paths(reports: list[Any]) -> list[str]:
    return [str(getattr(report, "path", "")) for report in reports]


def first_matching_line(corpus: str, patterns: list[str]) -> str:
    for line in corpus.splitlines():
        lowered = line.lower()
        if any(pattern in lowered for pattern in patterns):
            return redact_sensitive(line.strip()[:240])
    return "No single first-failing signal was isolated from the available reports."


def infer_technical_fault(corpus: str, category: str) -> str:
    lowered = corpus.lower()
    if "lock wait" in lowered or "deadlock" in lowered:
        return "Database lock contention or teardown overlap in shared test state."
    if "503" in lowered or "timeout" in lowered or "connection refused" in lowered:
        return "Downstream dependency readiness or network timeout during regression execution."
    if "expected" in lowered and "actual" in lowered:
        return "Assertion contract drift between expected and actual response payloads."
    if "callonce" in lowered or "beforefeature" in lowered or "classpath" in lowered:
        return "Karate lifecycle/setup failure before product behavior is proven."
    if category == "Data fixture drift":
        return "Mutable payment fixture ownership drift in card, token, PAN, or account state."
    return "Insufficiently isolated failure evidence; additional logs and payloads are required."


def infer_domain_findings(corpus: str, category: str) -> list[dict[str, Any]]:
    lowered = corpus.lower()
    findings: list[dict[str, Any]] = []
    if "iso8583" in lowered or "trace" in lowered or "stan" in lowered:
        findings.append(
            {
                "topic": "iso8583_field",
                "observed": "Trace or ISO8583 context appears in the failure evidence.",
                "expected_domain_behavior": "Parallel authorization tests should use unique trace numbers and correlation IDs.",
                "interpretation": "Shared trace state can make independent scenarios appear like duplicate or replayed auths.",
                "confidence": 82,
            }
        )
    if "token" in lowered or "card pool" in lowered or "pan" in lowered:
        findings.append(
            {
                "topic": "tokenization",
                "observed": "The failure references token, card pool, PAN, or reusable credential state.",
                "expected_domain_behavior": "Forward Auth tests should reserve owned synthetic credentials per scenario.",
                "interpretation": "Fixture reuse can create false declines, stale account state, or cross-test coupling.",
                "confidence": 86,
            }
        )
    if "response code" in lowered or "auth response" in lowered or '"05"' in lowered:
        findings.append(
            {
                "topic": "auth_response_code",
                "observed": "The failure includes authorization response-code evidence.",
                "expected_domain_behavior": "Response-code assertions should be compared against an isolated request and known-good baseline.",
                "interpretation": "Treat this as a product candidate only after environment, data, and assertion drift are excluded.",
                "confidence": 74 if category == "Product regression candidate" else 68,
            }
        )
    if not findings:
        findings.append(
            {
                "topic": "account_state",
                "observed": "No payment-domain specific field was isolated from the available artifacts.",
                "expected_domain_behavior": "Attach request XML, response payload, account state, and correlation ID for reliable interpretation.",
                "interpretation": "The domain expert cannot safely infer a product regression from the current evidence alone.",
                "confidence": 45,
            }
        )
    return findings


def infer_patch_type(category: str) -> str:
    if category == "Data fixture drift":
        return "fixture_only"
    if category == "Environment readiness":
        return "instrumentation"
    if category == "Assertion contract drift":
        return "assertion_update"
    if category == "Framework lifecycle fault":
        return "test_only"
    return "no_patch"


def build_multi_agent_contract(
    result: dict[str, Any],
    reports: list[Any],
    *,
    workflow: str = "classify",
    confidence_threshold: int = 90,
    target_file: str = DEFAULT_SELF_HEAL_TARGET,
    allowed_paths: list[str] | None = None,
    denied_paths: list[str] | None = None,
) -> dict[str, Any]:
    allowed = allowed_paths or list(DEFAULT_ALLOWED_PATHS)
    denied = denied_paths or list(DEFAULT_DENIED_PATHS)
    category = str(result.get("category") or "Unclassified failure")
    confidence = clamp_int(result.get("confidence"), 0, 100)
    raw_corpus = report_text(reports)
    corpus = redact_sensitive(raw_corpus)
    technical_fault = infer_technical_fault(corpus, category)
    first_signal = first_matching_line(
        corpus,
        ["fail", "failed", "error", "exception", "timeout", "503", "expected", "actual", "lock wait"],
    )
    patch_type = infer_patch_type(category)
    safe_path = path_allowed(target_file, allowed, denied)
    sensitive = contains_sensitive(raw_corpus)
    mock_eligible = category == "Environment readiness" or any(
        token in raw_corpus.lower() for token in ["503", "timeout", "connection refused", "unavailable"]
    )
    self_heal_reasons = []
    if confidence < confidence_threshold:
        self_heal_reasons.append(f"Confidence {confidence}% is below threshold {confidence_threshold}%.")
    if category not in SAFE_SELF_HEAL_CATEGORIES:
        self_heal_reasons.append(f"Category {category} is not eligible for autonomous draft PR creation.")
    if patch_type not in {"test_only", "fixture_only", "instrumentation"}:
        self_heal_reasons.append(f"Patch type {patch_type} requires explicit engineer approval.")
    if not safe_path:
        self_heal_reasons.append(f"Target path {target_file} is outside the allowlist.")
    if sensitive:
        self_heal_reasons.append("Potential sensitive payment data was detected; generated changes must remain synthetic.")

    eligible = not self_heal_reasons
    max_autonomy = "open_draft_pr" if eligible else ("propose_patch" if confidence >= 70 else "comment_only")
    action = "open_draft_pr" if eligible else ("propose_patch" if confidence >= 70 else "comment_only")
    karate_patch = str(result.get("karate_patch") or result.get("karateSketch") or default_karate_patch())

    return {
        "contract_version": CONTRACT_VERSION,
        "workflow": workflow,
        "run_id": "regauth-ci",
        "decision": {
            "action": action,
            "confidence": confidence,
            "risk": "low" if eligible else ("medium" if confidence >= 70 else "high"),
            "requires_human_review": True,
        },
        "diagnostician": {
            "role": "diagnostician",
            "category": category,
            "confidence": confidence,
            "technical_fault": technical_fault,
            "first_failing_signal": first_signal,
            "non_product_exclusions_checked": [
                "environment_readiness",
                "fixture_ownership",
                "karate_lifecycle",
                "assertion_contract",
            ],
            "known_good_comparison": {
                "available": False,
                "artifact": None,
                "summary": "No known-good artifact was supplied to this run.",
            },
        },
        "payments_domain_expert": {
            "role": "payments_domain_expert",
            "domain_findings": infer_domain_findings(corpus, category),
            "payment_data_safety": {
                "contains_sensitive_values": sensitive,
                "redaction_required": True,
                "synthetic_fixture_required": True,
            },
            "domain_escalation": {
                "needed": category == "Product regression candidate",
                "reason": "Product regression candidates need known-good comparison and owner review.",
            },
        },
        "karate_coder": {
            "role": "karate_coder",
            "patch_type": patch_type,
            "allowed_paths": allowed,
            "forbidden_paths": denied,
            "proposed_changes": [
                {
                    "path": target_file,
                    "operation": "create" if not Path(target_file).exists() else "update",
                    "rationale": str(result.get("suggested_fix") or result.get("recommendation") or "Improve isolation."),
                    "content": karate_patch,
                }
            ]
            if patch_type != "no_patch"
            else [],
            "karate_conventions": {
                "owns_test_data": category == "Data fixture drift",
                "parallel_safe": category in {"Data fixture drift", "Framework lifecycle fault"},
                "avoids_callonce_mutation": True,
                "assertions_scoped_to_owned_behavior": category != "Product regression candidate",
            },
        },
        "mock_generator": {
            "role": "mock_generator",
            "eligible": mock_eligible,
            "mock_scope": "dependency_stub" if mock_eligible else "no_mock",
            "synthetic_data_policy": {
                "real_pan_allowed": False,
                "real_tokens_allowed": False,
                "real_account_ids_allowed": False,
                "redaction_pattern_required": True,
            },
            "fixtures": build_mock_fixtures(corpus) if mock_eligible else [],
            "negative_cases": [
                "timeout response from downstream simulator",
                "malformed dependency payload",
                "dependency unavailable before auth decision",
            ]
            if mock_eligible
            else [],
            "refresh_policy": "manual_review|required_on_contract_change",
        },
        "pruner": {
            "role": "pruner",
            "mode": "recommend_only",
            "retention_rule": "Keep the latest failing report, the first known-good comparison, and any owner-approved feedback record.",
            "candidates": build_pruning_candidates(reports),
            "required_approval": "test_owner",
        },
        "self_heal_gate": {
            "role": "self_heal_gate",
            "eligible": eligible,
            "confidence": confidence,
            "max_autonomy": max_autonomy,
            "reasons": self_heal_reasons or ["All self-heal gates passed for draft PR creation."],
            "must_not_apply_if": [
                "product code touched",
                "real payment data present",
                "known-good comparison missing for product-regression claims",
                "validation command unavailable",
                "patch changes assertions without domain approval",
            ],
        },
    }


def build_mock_fixtures(corpus: str) -> list[dict[str, str]]:
    status = 503 if "503" in corpus else 200
    return [
        {
            "name": "wiremock-forward-auth-downstream",
            "format": "json",
            "source": "derived_from_redacted_log",
            "content": json.dumps(
                {
                    "request": {"method": "POST", "urlPathPattern": "/forward-auth/downstream/.*"},
                    "response": {
                        "status": 200,
                        "headers": {"Content-Type": "application/json"},
                        "jsonBody": {
                            "authResponseCode": "00",
                            "networkTraceId": "synthetic-trace-${json-unit.any-string}",
                            "downstreamStatusObserved": status,
                        },
                    },
                },
                indent=2,
            ),
        },
        {
            "name": "karate-start-mock",
            "format": "feature",
            "source": "hand_authored",
            "content": "\n".join(
                [
                    "Feature: Forward Auth downstream mock",
                    "",
                    "  Scenario: pathMatches('/forward-auth/downstream/.*')",
                    "    * def responseStatus = 200",
                    "    * def response = { authResponseCode: '00', networkTraceId: 'synthetic-trace' }",
                ]
            ),
        },
    ]


def build_pruning_candidates(reports: list[Any]) -> list[dict[str, Any]]:
    candidates = []
    seen_names: dict[str, int] = {}
    for path in report_paths(reports):
        name = Path(path).name.lower()
        seen_names[name] = seen_names.get(name, 0) + 1
    for name, count in sorted(seen_names.items()):
        if count > 1:
            candidates.append(
                {
                    "path_or_id": name,
                    "reason": "duplicate",
                    "last_seen": "current_run",
                    "safe_to_remove": False,
                }
            )
    if not candidates:
        candidates.append(
            {
                "path_or_id": "target/karate-reports",
                "reason": "low_signal",
                "last_seen": "current_run",
                "safe_to_remove": False,
            }
        )
    return candidates


def default_karate_patch() -> str:
    return "\n".join(
        [
            "Feature: Forward Auth generated isolation check",
            "",
            "  Background:",
            "    * def correlationId = java.util.UUID.randomUUID() + ''",
            "    * def requestPayload = read('classpath:payloads/forward-auth.xml')",
            "",
            "  Scenario: generated evidence replay with owned correlation",
            "    Given url authBaseUrl",
            "    And path '/forward-auth'",
            "    And header X-Correlation-Id = correlationId",
            "    And request requestPayload",
            "    When method post",
            "    Then status 200",
            "    And match responseHeaders['X-Correlation-Id'][0] == correlationId",
        ]
    )


def clamp_int(value: Any, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return minimum
    return max(minimum, min(maximum, parsed))

