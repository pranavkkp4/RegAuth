#!/usr/bin/env python3
"""Recommend Karate suite pruning and optimization opportunities."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Scenario:
    path: Path
    feature: str
    name: str
    steps: list[str]


def main() -> int:
    args = parse_args()
    test_root = Path(args.test_root)
    output = Path(args.output)
    scenarios = collect_scenarios(test_root)
    recommendations = analyze_scenarios(scenarios)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_markdown(test_root, scenarios, recommendations), encoding="utf-8")
    if args.emit_json:
        emit_path = Path(args.emit_json)
        emit_path.parent.mkdir(parents=True, exist_ok=True)
        emit_path.write_text(json.dumps(recommendations, indent=2), encoding="utf-8")
    print(f"Wrote pruning recommendations to {output}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze Karate feature files for redundant or low-signal test coverage.")
    parser.add_argument("--test-root", default=".", help="Repository or test directory to scan for .feature files.")
    parser.add_argument("--output", default="target/test-suite-pruning.md", help="Markdown output path.")
    parser.add_argument("--emit-json", help="Optional JSON output path.")
    return parser.parse_args()


def collect_scenarios(test_root: Path) -> list[Scenario]:
    scenarios: list[Scenario] = []
    for path in sorted(test_root.rglob("*.feature")):
        if any(part in {"node_modules", "dist", "target", ".git"} for part in path.parts):
            continue
        feature = path.stem
        current_name = ""
        steps: list[str] = []
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            stripped = line.strip()
            if stripped.startswith("Feature:"):
                feature = stripped.removeprefix("Feature:").strip() or feature
            elif stripped.startswith(("Scenario:", "Scenario Outline:")):
                if current_name:
                    scenarios.append(Scenario(path=path, feature=feature, name=current_name, steps=steps))
                current_name = re.sub(r"^Scenario(?: Outline)?:", "", stripped).strip()
                steps = []
            elif current_name and stripped.startswith(("*", "Given ", "When ", "Then ", "And ", "But ")):
                steps.append(normalize_step(stripped))
        if current_name:
            scenarios.append(Scenario(path=path, feature=feature, name=current_name, steps=steps))
    return scenarios


def analyze_scenarios(scenarios: list[Scenario]) -> list[dict[str, object]]:
    recommendations: list[dict[str, object]] = []
    by_name: dict[str, list[Scenario]] = defaultdict(list)
    by_signature: dict[str, list[Scenario]] = defaultdict(list)
    by_feature: dict[str, list[Scenario]] = defaultdict(list)
    for scenario in scenarios:
        by_name[scenario.name.lower()].append(scenario)
        signature = "\n".join(scenario.steps[:8])
        by_signature[signature].append(scenario)
        by_feature[str(scenario.path)].append(scenario)

    for name, matches in by_name.items():
        if len(matches) > 1:
            recommendations.append(candidate("duplicate_name", name, matches, "Review duplicate scenario names for consolidation."))

    for signature, matches in by_signature.items():
        if signature and len(matches) > 1:
            recommendations.append(candidate("duplicate_flow", signature[:120], matches, "Convert repeated steps into Scenario Outline examples."))

    for path, matches in by_feature.items():
        if len(matches) >= 4:
            shared_prefix = common_prefix_count([scenario.steps for scenario in matches])
            if shared_prefix >= 3:
                recommendations.append(
                    candidate(
                        "data_driven_candidate",
                        path,
                        matches,
                        "Multiple scenarios share setup and assertions; evaluate Scenario Outline/Examples to reduce CI time.",
                    )
                )

    if not recommendations:
        recommendations.append(
            {
                "type": "no_action",
                "subject": "feature_scan",
                "reason": "No duplicate Karate scenario patterns were detected in the scanned tree.",
                "safe_to_apply": False,
                "paths": [],
            }
        )
    return recommendations


def candidate(kind: str, subject: str, matches: list[Scenario], reason: str) -> dict[str, object]:
    return {
        "type": kind,
        "subject": subject,
        "reason": reason,
        "safe_to_apply": False,
        "paths": sorted({str(match.path) for match in matches}),
        "scenarios": [match.name for match in matches[:8]],
    }


def common_prefix_count(step_sets: list[list[str]]) -> int:
    if not step_sets:
        return 0
    count = 0
    for index, first_step in enumerate(step_sets[0]):
        if all(len(steps) > index and steps[index] == first_step for steps in step_sets[1:]):
            count += 1
        else:
            break
    return count


def normalize_step(step: str) -> str:
    step = re.sub(r"['\"][^'\"]+['\"]", "'<value>'", step)
    step = re.sub(r"\b\d+\b", "<number>", step)
    return step.lower()


def render_markdown(test_root: Path, scenarios: list[Scenario], recommendations: list[dict[str, object]]) -> str:
    return "\n".join(
        [
            "# RegAuth Test Suite Pruning Report",
            "",
            f"Scanned root: `{test_root}`",
            f"Karate scenarios found: `{len(scenarios)}`",
            "",
            "This report is recommendation-only. It does not delete, quarantine, or rewrite tests.",
            "",
            "## Recommendations",
            "",
            *[
                "\n".join(
                    [
                        f"### {item['type']}: {item['subject']}",
                        "",
                        f"- Reason: {item['reason']}",
                        f"- Safe to apply automatically: `{str(item['safe_to_apply']).lower()}`",
                        f"- Paths: {', '.join(f'`{path}`' for path in item.get('paths', [])) or '`n/a`'}",
                    ]
                )
                for item in recommendations
            ],
            "",
            "## Optimization Methods",
            "",
            "- Prefer Scenario Outline/Examples when multiple tests share the same auth setup and only data changes.",
            "- Keep one representative positive and negative path per auth behavior unless domain risk requires broader coverage.",
            "- Quarantine flaky infrastructure tests only after preserving a reproducer and owner-approved rationale.",
        ]
    )


if __name__ == "__main__":
    raise SystemExit(main())

