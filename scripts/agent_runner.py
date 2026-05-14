#!/usr/bin/env python3
"""Run the Forward Auth failure agent over Karate reports and write PR markdown."""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"
MAX_FILE_BYTES = 80_000
MAX_TOTAL_BYTES = 240_000
MAX_FEEDBACK_SNIPPETS = 5
MAX_FEEDBACK_CHARS = 6_000

CATEGORIES = [
    "Data fixture drift",
    "Environment readiness",
    "Assertion contract drift",
    "Framework lifecycle fault",
    "Product regression candidate",
    "Unclassified failure",
]

REPORT_PATTERNS = (
    "*.log",
    "*.txt",
    "*.xml",
    "*.json",
    "*.html",
    "*.feature",
    "*.ndjson",
)


@dataclass
class ReportFile:
    path: Path
    text: str
    truncated: bool


@dataclass
class FeedbackSnippet:
    title: str
    text: str
    score: int


@dataclass
class AgentResult:
    category: str
    confidence: int
    signals: list[str]
    hypothesis: str
    suggested_fix: str
    karate_patch: str
    validation_plan: list[str]
    source: str
    model: str | None = None
    token_usage: dict[str, int] | None = None
    error: str | None = None
    retrieved_feedback: list[FeedbackSnippet] = field(default_factory=list)


FAILURE_RULES = [
    {
        "category": "Data fixture drift",
        "keywords": ["card pool", "fixture", "account state", "token", "test data", "pan", "expired"],
        "hypothesis": "The failure points to mutable or exhausted payment test data rather than a deterministic product defect.",
        "suggested_fix": "Reserve owned card/account/token fixtures inside the scenario setup and quarantine or reset any exhausted data before retrying CI.",
    },
    {
        "category": "Environment readiness",
        "keywords": ["timeout", "503", "connection refused", "health check", "unavailable", "latency", "socket"],
        "hypothesis": "The first-order signal is service readiness or dependency instability.",
        "suggested_fix": "Add an explicit dependency health gate, capture service status in CI artifacts, and rerun the selected scenario after readiness is proven.",
    },
    {
        "category": "Assertion contract drift",
        "keywords": ["expected", "actual", "assert", "match failed", "schema", "status code", "path:"],
        "hypothesis": "The response contract or assertion boundary appears to have moved.",
        "suggested_fix": "Compare expected versus actual payloads, update only intentional contract expectations, and keep assertions scoped to owned Forward Auth behavior.",
    },
    {
        "category": "Framework lifecycle fault",
        "keywords": ["karate", "java.lang", "nullpointer", "beforefeature", "callonce", "hook", "classpath"],
        "hypothesis": "The automation layer likely failed during setup, shared utilities, or Karate lifecycle execution.",
        "suggested_fix": "Instrument the failing hook or shared utility, isolate a minimal repro feature, and avoid routing this as a product regression until setup passes.",
    },
    {
        "category": "Product regression candidate",
        "keywords": ["authorization declined", "approved expected", "iso8583", "iso 8583", "auth response", "response code"],
        "hypothesis": "The evidence could indicate a Forward Auth behavior change, pending comparison with a prior known-good run.",
        "suggested_fix": "Preserve the failing XML/request pair, compare against the last passing CI artifact, and open an engineer-reviewed defect only after isolated reproduction.",
    },
]


def main() -> int:
    args = parse_args()
    log_dir = Path(args.log_dir)
    output_path = Path(args.output)
    feedback_path = Path(args.feedback_file) if args.feedback_file else None

    reports = collect_reports(log_dir)
    failure_text = "\n".join(report.text for report in reports)
    retrieved_feedback = retrieve_feedback(feedback_path, failure_text) if feedback_path else []
    prompt = build_prompt(reports, log_dir, retrieved_feedback)
    result = run_agent(prompt, reports, retrieved_feedback)
    markdown = render_markdown(result, reports, log_dir, feedback_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8")

    if args.save_feedback:
        if not feedback_path:
            raise SystemExit("--save-feedback requires --feedback-file")
        append_feedback_record(feedback_path, result, reports)
        print(f"Saved compact feedback record to {feedback_path}")

    print(f"Wrote AI agent summary to {output_path}")
    print(f"Agent mode: {result.source}")
    if result.error:
        print(f"Agent fallback reason: {result.error}", file=sys.stderr)
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze Karate failure reports with Anthropic, optional Gemini fallback, and local rules.",
    )
    parser.add_argument("--log-dir", required=True, help="Directory containing Karate reports, logs, XML payloads, or CI output.")
    parser.add_argument(
        "--output",
        default="target/karate-ai-agent-summary.md",
        help="Markdown file to write for a pull request comment.",
    )
    parser.add_argument(
        "--feedback-file",
        help="Optional markdown knowledge file used for retrieval-augmented failure analysis.",
    )
    parser.add_argument(
        "--save-feedback",
        action="store_true",
        help="Append a compact diagnosis record to --feedback-file. Off by default for CI safety.",
    )
    return parser.parse_args()


def collect_reports(log_dir: Path) -> list[ReportFile]:
    if not log_dir.exists():
        return [
            ReportFile(
                path=log_dir / "missing-report-directory.txt",
                text=f"Report directory does not exist: {log_dir}",
                truncated=False,
            )
        ]

    files: list[Path] = []
    for pattern in REPORT_PATTERNS:
        files.extend(path for path in log_dir.rglob(pattern) if path.is_file())

    if not files:
        return [
            ReportFile(
                path=log_dir / "empty-report-directory.txt",
                text=f"No readable Karate report files were found in {log_dir}.",
                truncated=False,
            )
        ]

    reports: list[ReportFile] = []
    total_bytes = 0
    for path in sorted(set(files), key=lambda item: str(item).lower()):
        if total_bytes >= MAX_TOTAL_BYTES:
            break
        raw = path.read_bytes()
        budget = min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - total_bytes)
        sliced = raw[:budget]
        text = sliced.decode("utf-8", errors="replace")
        truncated = len(raw) > len(sliced)
        total_bytes += len(sliced)
        reports.append(ReportFile(path=path, text=text, truncated=truncated))
    return reports


def build_prompt(reports: list[ReportFile], log_dir: Path, feedback: list[FeedbackSnippet]) -> str:
    report_blocks = []
    for report in reports:
        report_blocks.append(
            "\n".join(
                [
                    '<report_file path="{}" truncated="{}">'.format(
                        escape_xml(str(report.path)),
                        "true" if report.truncated else "false",
                    ),
                    escape_xml(report.text),
                    "</report_file>",
                ]
            )
        )

    feedback_blocks = []
    for index, snippet in enumerate(feedback, start=1):
        feedback_blocks.append(
            "\n".join(
                [
                    f'<feedback_snippet index="{index}" score="{snippet.score}" title="{escape_xml(snippet.title)}">',
                    escape_xml(snippet.text),
                    "</feedback_snippet>",
                ]
            )
        )

    return "\n".join(
        [
            "<triage_request>",
            "<context>",
            "Forward Auth regression CI detected a Karate test failure. Analyze logs, XML payloads, report fragments, and retrieved feedback.",
            "Separate automation, data, environment, assertion, and product-regression evidence.",
            f"Report directory: {escape_xml(str(log_dir))}",
            "</context>",
            "<retrieved_feedback>",
            *(feedback_blocks or ["<none>No matching feedback snippets were retrieved.</none>"]),
            "</retrieved_feedback>",
            "<reports>",
            *report_blocks,
            "</reports>",
            "<output_contract>",
            "Call emit_forward_auth_root_cause with a concise engineer-reviewable diagnosis and validation plan.",
            "</output_contract>",
            "</triage_request>",
        ]
    )


def run_agent(prompt: str, reports: list[ReportFile], feedback: list[FeedbackSnippet]) -> AgentResult:
    anthro_error = None
    if os.getenv("ANTHROPIC_API_KEY", "").strip():
        try:
            message = call_anthropic(prompt)
            result = parse_anthropic_message(message)
            result.retrieved_feedback = feedback
            return result
        except Exception as exc:  # noqa: BLE001 - CI must keep moving and still produce a PR comment.
            anthro_error = f"Anthropic route failed: {exc}"

    gemini_error = None
    if os.getenv("GEMINI_API_KEY", "").strip():
        try:
            result = call_gemini(prompt)
            result.retrieved_feedback = feedback
            return result
        except Exception as exc:  # noqa: BLE001 - optional fallback should not break comments.
            gemini_error = f"Gemini route failed: {exc}"

    error = "; ".join(item for item in [anthro_error, gemini_error, missing_key_note()] if item)
    return local_analysis(reports, feedback, source="local deterministic fallback", error=error or None)


def call_anthropic(prompt: str) -> dict[str, Any]:
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        message = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL),
            max_tokens=1800,
            temperature=0,
            system=build_system_blocks(),
            tools=build_tools(),
            tool_choice={"type": "tool", "name": "emit_forward_auth_root_cause"},
            messages=[{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        )
        return message.model_dump()
    except ImportError:
        return call_anthropic_http(prompt)


def call_anthropic_http(prompt: str) -> dict[str, Any]:
    body = {
        "model": os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL),
        "max_tokens": 1800,
        "temperature": 0,
        "system": build_system_blocks(),
        "tools": build_tools(),
        "tool_choice": {"type": "tool", "name": "emit_forward_auth_root_cause"},
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    }
    headers = {
        "content-type": "application/json",
        "x-api-key": os.environ["ANTHROPIC_API_KEY"],
        "anthropic-version": ANTHROPIC_VERSION,
    }
    beta_header = os.getenv("ANTHROPIC_BETA", "").strip()
    if beta_header:
        headers["anthropic-beta"] = beta_header

    request = urllib.request.Request(
        ANTHROPIC_API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Anthropic API returned HTTP {exc.code}: {payload[:600]}") from exc


def call_gemini(prompt: str) -> AgentResult:
    import google.generativeai as genai

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    response = genai.GenerativeModel(model_name).generate_content(
        "\n".join(
            [
                "<system>",
                "Return strict JSON for a Forward Auth CI root-cause summary.",
                "Keys: category, confidence, signals, hypothesis, suggested_fix, karate_patch, validation_plan.",
                "</system>",
                prompt,
            ]
        ),
        generation_config={"temperature": 0, "max_output_tokens": 1800, "response_mime_type": "application/json"},
    )
    payload = parse_json_text(getattr(response, "text", ""))
    return AgentResult(
        category=clean_category(payload.get("category")),
        confidence=clamp_int(payload.get("confidence"), 0, 100),
        signals=clean_list(payload.get("signals"), ["Gemini did not return explicit evidence signals."]),
        hypothesis=clean_text(payload.get("hypothesis"), "No hypothesis returned."),
        suggested_fix=clean_text(payload.get("suggested_fix"), "No fix returned."),
        karate_patch=clean_text(payload.get("karate_patch"), default_karate_patch()),
        validation_plan=clean_list(payload.get("validation_plan"), default_validation_plan()),
        source="Gemini fallback",
        model=model_name,
    )


def build_system_blocks() -> list[dict[str, Any]]:
    return [
        {
            "type": "text",
            "text": "\n".join(
                [
                    "<role>",
                    "You are a Forward Auth CI root-cause agent for Karate regression failures.",
                    "You produce evidence-grounded analysis for pull request review, not broad speculation.",
                    "</role>",
                    "<operating_rules>",
                    "Use XML report and retrieved_feedback tags as the source of truth.",
                    "Distinguish data fixture drift, environment readiness, assertion contract drift, framework lifecycle faults, and product regression candidates.",
                    "Never include secrets. Do not claim a product regression unless the artifacts support it.",
                    "Return only a tool call to emit_forward_auth_root_cause.",
                    "</operating_rules>",
                ]
            ),
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": "\n".join(
                [
                    "<reference>",
                    "<karate>Karate failures often originate in shared setup, callonce state, mutable fixtures, schema assertions, or service readiness.</karate>",
                    "<forward_auth>Forward Auth regression review should preserve XML payloads, auth response codes, correlation IDs, and known-good comparisons.</forward_auth>",
                    "<ci>CI output should be concise, actionable, safe to post as markdown on a pull request, and informed by retrieved feedback when relevant.</ci>",
                    "</reference>",
                ]
            ),
            "cache_control": {"type": "ephemeral"},
        },
    ]


def build_tools() -> list[dict[str, Any]]:
    return [
        {
            "name": "emit_forward_auth_root_cause",
            "description": "Emit PR-safe root-cause analysis for a failed Forward Auth Karate run.",
            "input_schema": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "category",
                    "confidence",
                    "signals",
                    "hypothesis",
                    "suggested_fix",
                    "karate_patch",
                    "validation_plan",
                ],
                "properties": {
                    "category": {"type": "string", "enum": CATEGORIES},
                    "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
                    "signals": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 6,
                        "items": {"type": "string", "minLength": 1},
                    },
                    "hypothesis": {"type": "string", "minLength": 1},
                    "suggested_fix": {"type": "string", "minLength": 1},
                    "karate_patch": {"type": "string", "minLength": 1},
                    "validation_plan": {
                        "type": "array",
                        "minItems": 3,
                        "maxItems": 6,
                        "items": {"type": "string", "minLength": 1},
                    },
                },
            },
            "cache_control": {"type": "ephemeral"},
        }
    ]


def parse_anthropic_message(message: dict[str, Any]) -> AgentResult:
    for block in message.get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == "emit_forward_auth_root_cause":
            payload = block.get("input") or {}
            return AgentResult(
                category=clean_category(payload.get("category")),
                confidence=clamp_int(payload.get("confidence"), 0, 100),
                signals=clean_list(payload.get("signals"), ["Anthropic did not return explicit evidence signals."]),
                hypothesis=clean_text(payload.get("hypothesis"), "No hypothesis returned."),
                suggested_fix=clean_text(payload.get("suggested_fix"), "No fix returned."),
                karate_patch=clean_text(payload.get("karate_patch"), default_karate_patch()),
                validation_plan=clean_list(payload.get("validation_plan"), default_validation_plan()),
                source="Anthropic primary",
                model=message.get("model"),
                token_usage=message.get("usage") or {},
            )
    raise RuntimeError("Anthropic did not return the expected emit_forward_auth_root_cause tool call.")


def retrieve_feedback(feedback_path: Path | None, failure_text: str) -> list[FeedbackSnippet]:
    if not feedback_path or not feedback_path.exists():
        return []
    text = feedback_path.read_text(encoding="utf-8", errors="replace")
    chunks = split_feedback(text)
    query_terms = set(tokenize(failure_text))
    query_terms.update(keyword for rule in FAILURE_RULES for keyword in rule["keywords"] if keyword in failure_text.lower())

    snippets: list[FeedbackSnippet] = []
    for title, chunk in chunks:
        haystack = chunk.lower()
        score = sum(3 for term in query_terms if len(term) > 3 and term in haystack)
        score += sum(5 for rule in FAILURE_RULES if rule["category"].lower() in haystack and any(k in failure_text.lower() for k in rule["keywords"]))
        if score > 0:
            snippets.append(FeedbackSnippet(title=title, text=chunk[:MAX_FEEDBACK_CHARS], score=score))

    snippets.sort(key=lambda item: item.score, reverse=True)
    return snippets[:MAX_FEEDBACK_SNIPPETS]


def split_feedback(text: str) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    current_title = "General feedback"
    current_lines: list[str] = []
    for line in text.splitlines():
        if line.startswith("#"):
            if current_lines:
                blocks.append((current_title, "\n".join(current_lines).strip()))
                current_lines = []
            current_title = line.lstrip("#").strip() or "Untitled feedback"
        else:
            current_lines.append(line)
    if current_lines:
        blocks.append((current_title, "\n".join(current_lines).strip()))
    return [(title, body) for title, body in blocks if body]


def local_analysis(
    reports: list[ReportFile],
    feedback: list[FeedbackSnippet],
    source: str,
    error: str | None = None,
) -> AgentResult:
    corpus = "\n".join(report.text for report in reports).lower()
    scored = []
    for rule in FAILURE_RULES:
        signals = [keyword for keyword in rule["keywords"] if keyword in corpus]
        feedback_boost = sum(1 for snippet in feedback if rule["category"].lower() in snippet.text.lower())
        scored.append((len(signals) + feedback_boost, signals, rule))
    scored.sort(key=lambda item: item[0], reverse=True)

    score, signals, rule = scored[0]
    if score == 0:
        rule = {
            "category": "Unclassified failure",
            "hypothesis": "The captured reports do not contain enough recognizable failure evidence for a confident diagnosis.",
            "suggested_fix": "Attach the first failing Karate assertion, request/response XML, dependency health, and scenario setup output to the CI artifact.",
        }
        signals = first_failure_lines(corpus) or ["No matching taxonomy keywords were found."]

    feedback_signals = [f"Feedback: {snippet.title}" for snippet in feedback[:2]]
    confidence = 38 if rule["category"] == "Unclassified failure" else min(92, 56 + score * 10)
    return AgentResult(
        category=rule["category"],
        confidence=confidence,
        signals=(signals + feedback_signals)[:6],
        hypothesis=rule["hypothesis"],
        suggested_fix=rule["suggested_fix"],
        karate_patch=default_karate_patch(),
        validation_plan=default_validation_plan(),
        source=source,
        error=error,
        retrieved_feedback=feedback,
    )


def render_markdown(
    result: AgentResult,
    reports: list[ReportFile],
    log_dir: Path,
    feedback_path: Path | None,
) -> str:
    files = "\n".join(
        f"- `{report.path}`{' (truncated)' if report.truncated else ''}" for report in reports[:12]
    )
    if len(reports) > 12:
        files += f"\n- ...and {len(reports) - 12} more files"

    usage = ""
    if result.token_usage:
        usage = "\n".join(
            [
                "",
                "**Token usage**",
                "",
                f"- Input tokens: `{result.token_usage.get('input_tokens', 0)}`",
                f"- Output tokens: `{result.token_usage.get('output_tokens', 0)}`",
                f"- Cache creation input tokens: `{result.token_usage.get('cache_creation_input_tokens', 0)}`",
                f"- Cache read input tokens: `{result.token_usage.get('cache_read_input_tokens', 0)}`",
                "",
            ]
        )

    feedback_lines = ["- No feedback knowledge file was configured."]
    if feedback_path:
        feedback_lines = [f"- Knowledge file: `{feedback_path}`"]
        if result.retrieved_feedback:
            feedback_lines.extend(
                f"- Retrieved `{snippet.title}` (score {snippet.score})" for snippet in result.retrieved_feedback
            )
        else:
            feedback_lines.append("- No relevant snippets matched this failure.")

    fallback_note = f"\n> Fallback note: {result.error}\n" if result.error else ""

    return "\n".join(
        [
            "<!-- regauth-ai-agent -->",
            "## Forward Auth AI Agent Root-Cause Summary",
            "",
            f"**Agent mode:** {result.source}{f' (`{result.model}`)' if result.model else ''}",
            f"**Report directory:** `{log_dir}`",
            f"**Likely category:** {result.category}",
            f"**Confidence:** {result.confidence}%",
            fallback_note.rstrip(),
            "",
            "**Evidence signals**",
            "",
            *[f"- {signal}" for signal in result.signals],
            "",
            "**Retrieved feedback**",
            "",
            *feedback_lines,
            "",
            "**Hypothesis**",
            "",
            result.hypothesis,
            "",
            "**Suggested fix**",
            "",
            result.suggested_fix,
            "",
            "**Karate sketch**",
            "",
            "```gherkin",
            result.karate_patch.strip(),
            "```",
            "",
            "**Validation plan**",
            "",
            *[f"{index}. {item}" for index, item in enumerate(result.validation_plan, start=1)],
            "",
            "**Analyzed artifacts**",
            "",
            files or "- No report files found.",
            usage.rstrip(),
            "",
            "_Generated by `scripts/agent_runner.py` for PR review._",
            "",
        ]
    )


def append_feedback_record(feedback_path: Path, result: AgentResult, reports: list[ReportFile]) -> None:
    feedback_path.parent.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    evidence = "; ".join(result.signals[:3])
    report_names = ", ".join(str(report.path) for report in reports[:4])
    record = "\n".join(
        [
            "",
            f"## {now} - {result.category}",
            "",
            f"- Confidence: {result.confidence}%",
            f"- Evidence: {evidence}",
            f"- Hypothesis: {result.hypothesis}",
            f"- Suggested fix: {result.suggested_fix}",
            f"- Reports: {report_names}",
            "",
        ]
    )
    with feedback_path.open("a", encoding="utf-8") as handle:
        handle.write(record)


def default_karate_patch() -> str:
    return "\n".join(
        [
            "Feature: Forward Auth regression evidence path",
            "",
            "  Background:",
            "    * def requestPayload = read('classpath:payloads/forward-auth.xml')",
            "    * def correlationId = java.util.UUID.randomUUID() + ''",
            "",
            "  Scenario: isolated authorization behavior with owned evidence",
            "    Given url authBaseUrl",
            "    And path '/forward-auth'",
            "    And header X-Correlation-Id = correlationId",
            "    And request requestPayload",
            "    When method post",
            "    Then status 200",
            "    And match responseHeaders['X-Correlation-Id'][0] == correlationId",
        ]
    )


def default_validation_plan() -> list[str]:
    return [
        "Reproduce the failing scenario from a clean checkout with only the selected Karate feature enabled.",
        "Confirm account, card, token, and XML payload setup is owned by the scenario or freshly reserved.",
        "Compare current response payloads against the most recent known-good CI artifact.",
        "Rerun the full regression gate after the fix and attach the Karate report artifact to the PR.",
    ]


def first_failure_lines(corpus: str) -> list[str]:
    signals = []
    for line in corpus.splitlines():
        if re.search(r"\b(fail|failed|error|exception|expected|actual)\b", line):
            signals.append(line.strip()[:180])
        if len(signals) == 4:
            break
    return signals


def parse_json_text(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def missing_key_note() -> str | None:
    missing = []
    if not os.getenv("ANTHROPIC_API_KEY", "").strip():
        missing.append("ANTHROPIC_API_KEY was not set")
    if not os.getenv("GEMINI_API_KEY", "").strip():
        missing.append("GEMINI_API_KEY was not set")
    return "; ".join(missing) if missing else None


def clean_category(value: Any) -> str:
    return value if isinstance(value, str) and value in CATEGORIES else "Unclassified failure"


def clean_text(value: Any, fallback: str) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def clean_list(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback
    cleaned = [str(item).strip() for item in value if str(item).strip()]
    return cleaned or fallback


def clamp_int(value: Any, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return minimum
    return max(minimum, min(maximum, parsed))


def tokenize(value: str) -> list[str]:
    return re.findall(r"[a-z0-9][a-z0-9_.:-]{2,}", value.lower())


def escape_xml(value: str) -> str:
    return html.escape(value, quote=True)


if __name__ == "__main__":
    raise SystemExit(main())
