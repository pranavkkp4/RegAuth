#!/usr/bin/env python3
"""Generate synthetic downstream mocks from RegAuth failure artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from regauth_pipeline import build_mock_fixtures, redact_sensitive


REPORT_PATTERNS = ("*.log", "*.txt", "*.xml", "*.json", "*.html", "*.feature", "*.ndjson")


def main() -> int:
    args = parse_args()
    log_dir = Path(args.log_dir)
    output_dir = Path(args.output_dir)
    corpus = collect_text(log_dir)
    redacted = redact_sensitive(corpus)
    fixtures = build_mock_fixtures(redacted)

    output_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for fixture in fixtures:
        suffix = {"json": ".json", "xml": ".xml", "feature": ".feature"}.get(fixture["format"], ".txt")
        path = output_dir / f"{fixture['name']}{suffix}"
        path.write_text(fixture["content"], encoding="utf-8")
        written.append(path)

    plan_path = output_dir / "mock-generation-plan.md"
    plan_path.write_text(render_plan(log_dir, fixtures, written), encoding="utf-8")
    print(f"Wrote {len(written)} mock artifact(s) and plan to {output_dir}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate WireMock/Karate mock artifacts from redacted failure evidence.")
    parser.add_argument("--log-dir", required=True, help="Directory containing Karate reports and logs.")
    parser.add_argument("--output-dir", default="target/generated-mocks", help="Directory for generated mock artifacts.")
    return parser.parse_args()


def collect_text(log_dir: Path) -> str:
    if not log_dir.exists():
        return f"Report directory does not exist: {log_dir}"

    parts = []
    for pattern in REPORT_PATTERNS:
        for path in sorted(log_dir.rglob(pattern)):
            if path.is_file():
                parts.append(f"<file path='{path}'>\n{path.read_text(encoding='utf-8', errors='replace')[:40_000]}\n</file>")
    return "\n".join(parts) if parts else f"No readable report files were found in {log_dir}."


def render_plan(log_dir: Path, fixtures: list[dict[str, str]], written: list[Path]) -> str:
    return "\n".join(
        [
            "# RegAuth Dynamic Mock Generation Plan",
            "",
            f"Source reports: `{log_dir}`",
            "",
            "These artifacts are generated from redacted failure evidence. They are intended for engineer review before being copied into a Karate suite.",
            "",
            "## Generated Artifacts",
            "",
            *[f"- `{path}`" for path in written],
            "",
            "## Fixture Contracts",
            "",
            "```json",
            json.dumps(
                [
                    {
                        "name": fixture["name"],
                        "format": fixture["format"],
                        "source": fixture["source"],
                    }
                    for fixture in fixtures
                ],
                indent=2,
            ),
            "```",
            "",
            "## Safety Rules",
            "",
            "- Real PANs, account IDs, provider secrets, and tokens are redacted.",
            "- Generated mocks use synthetic response values only.",
            "- Commit mock fixtures only after payment-domain owner review.",
        ]
    )


if __name__ == "__main__":
    raise SystemExit(main())

