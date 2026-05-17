#!/usr/bin/env python3
"""Open a guarded draft PR for high-confidence RegAuth test-only fixes."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from regauth_pipeline import DEFAULT_SELF_HEAL_TARGET, path_allowed


DEFAULT_ALLOWED_PATHS = ["src/test/**", "features/**", "mocks/**"]
DEFAULT_DENIED_PATHS = [".github/**", "server/**", "src/main/**", ".env", ".env.*", "secrets/**"]


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    payload = json.loads(Path(args.result_json).read_text(encoding="utf-8"))
    plan = build_plan(payload, args)
    plan_output = Path(args.plan_output)
    plan_output.parent.mkdir(parents=True, exist_ok=True)
    plan_output.write_text(render_plan(plan, args.execute), encoding="utf-8")

    if not args.execute:
        print(f"Dry run only. Wrote self-healing plan to {plan_output}")
        return 0

    if not plan["eligible"]:
        print(f"Self-healing PR skipped: {'; '.join(plan['reasons'])}")
        return 0

    apply_change(repo_root, plan["target_file"], plan["content"])
    branch = create_branch(repo_root, args.branch_prefix)
    run_git(repo_root, ["add", plan["target_file"]])
    run_git(repo_root, ["commit", "-m", args.commit_message])
    run_git(repo_root, ["push", "-u", "origin", branch])
    create_draft_pr(repo_root, branch, args.base_branch, plan, args.reviewer)
    print(f"Opened draft self-healing PR from {branch}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a guarded draft PR for a generated RegAuth test fix.")
    parser.add_argument("--result-json", required=True, help="JSON emitted by scripts/agent_runner.py --emit-json.")
    parser.add_argument("--repo-root", default=".", help="Repository root.")
    parser.add_argument("--target-file", default=DEFAULT_SELF_HEAL_TARGET, help="Allowlisted feature file to create/update.")
    parser.add_argument("--plan-output", default="target/self-heal-draft-pr.md", help="Markdown plan path.")
    parser.add_argument("--threshold", type=int, default=90, help="Minimum confidence for draft PR creation.")
    parser.add_argument("--base-branch", default="main", help="Base branch for the draft PR.")
    parser.add_argument("--branch-prefix", default="ai-fix", help="Generated branch prefix.")
    parser.add_argument("--commit-message", default="test: add generated RegAuth isolation fix", help="Commit message.")
    parser.add_argument("--reviewer", default="", help="Optional GitHub username to request as reviewer.")
    parser.add_argument("--allow-path", action="append", default=DEFAULT_ALLOWED_PATHS, help="Allowed path glob. Repeatable.")
    parser.add_argument("--deny-path", action="append", default=DEFAULT_DENIED_PATHS, help="Denied path glob. Repeatable.")
    parser.add_argument("--execute", action="store_true", help="Actually create branch, commit, push, and open a draft PR.")
    return parser.parse_args()


def build_plan(payload: dict[str, object], args: argparse.Namespace) -> dict[str, object]:
    result = payload.get("result") or {}
    multi_agent = payload.get("multi_agent") or {}
    gate = multi_agent.get("self_heal_gate") or {}
    coder = multi_agent.get("karate_coder") or {}
    changes = coder.get("proposed_changes") or []
    selected = changes[0] if changes else {}
    target_file = args.target_file or selected.get("path") or DEFAULT_SELF_HEAL_TARGET
    content = selected.get("content") or result.get("karate_patch") or ""
    confidence = int(gate.get("confidence") or result.get("confidence") or 0)
    reasons = list(gate.get("reasons") or [])

    if confidence < args.threshold:
        reasons.append(f"Confidence {confidence}% is below execution threshold {args.threshold}%.")
    if not gate.get("eligible"):
        reasons.append("Self-heal gate did not mark this run eligible.")
    if not path_allowed(str(target_file), args.allow_path, args.deny_path):
        reasons.append(f"Target path {target_file} is outside the allowlist or matches a denied pattern.")
    if not content.strip():
        reasons.append("No generated Karate content was available.")

    return {
        "eligible": not reasons,
        "confidence": confidence,
        "target_file": str(target_file).replace("\\", "/"),
        "content": content,
        "category": result.get("category", "Unclassified failure"),
        "hypothesis": result.get("hypothesis", ""),
        "reasons": reasons or ["All execution gates passed."],
    }


def render_plan(plan: dict[str, object], execute: bool) -> str:
    return "\n".join(
        [
            "# RegAuth Self-Healing Draft PR Plan",
            "",
            f"Mode: `{'execute' if execute else 'dry-run'}`",
            f"Eligible: `{str(plan['eligible']).lower()}`",
            f"Confidence: `{plan['confidence']}%`",
            f"Target file: `{plan['target_file']}`",
            f"Category: `{plan['category']}`",
            "",
            "## Gate Reasons",
            "",
            *[f"- {reason}" for reason in plan["reasons"]],
            "",
            "## Proposed Karate Content",
            "",
            "```gherkin",
            str(plan["content"]).strip(),
            "```",
            "",
            "This automation never merges. It only opens a draft PR when execution is explicitly enabled and all gates pass.",
        ]
    )


def apply_change(repo_root: Path, target_file: str, content: str) -> None:
    target = (repo_root / target_file).resolve()
    if repo_root not in target.parents and target != repo_root:
        raise SystemExit(f"Refusing to write outside repository: {target}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def create_branch(repo_root: Path, prefix: str) -> str:
    safe_suffix = run_git(repo_root, ["rev-parse", "--short", "HEAD"]).stdout.strip()
    branch = f"{prefix}/regauth-{safe_suffix}"
    run_git(repo_root, ["checkout", "-B", branch])
    return branch


def create_draft_pr(repo_root: Path, branch: str, base_branch: str, plan: dict[str, object], reviewer: str) -> None:
    body_path = repo_root / "target" / "self-heal-pr-body.md"
    body_path.parent.mkdir(parents=True, exist_ok=True)
    body_path.write_text(render_plan(plan, execute=True), encoding="utf-8")
    command = [
        "gh",
        "pr",
        "create",
        "--draft",
        "--base",
        base_branch,
        "--head",
        branch,
        "--title",
        "[RegAuth] AI-generated test isolation fix",
        "--body-file",
        str(body_path),
    ]
    if reviewer:
        command.extend(["--reviewer", reviewer])
    subprocess.run(command, cwd=repo_root, check=True)


def run_git(repo_root: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=repo_root, check=True, text=True, capture_output=True)


if __name__ == "__main__":
    raise SystemExit(main())

