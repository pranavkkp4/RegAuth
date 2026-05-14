#!/usr/bin/env python3
"""Presentation-ready terminal walkthrough for the Forward Auth AI Agent."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import textwrap
import time
from dataclasses import dataclass
from pathlib import Path


try:
    from rich import box
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.prompt import Prompt
    from rich.syntax import Syntax
    from rich.table import Table

    RICH_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised manually when Rich is absent.
    RICH_AVAILABLE = False


@dataclass
class DemoStep:
    title: str
    body: str
    artifact: str | None = None
    language: str = "text"


@dataclass
class RoutingResult:
    provider: str
    model: str | None
    text: str
    fallback_reason: str | None = None


LOG_SAMPLE = """[INFO] Running com.visa.forwardauth.AuthorizationRegression
[ERROR] Scenario: isolated authorization behavior
[ERROR] path: $.auth.responseCode, actual: "05", expected: "00"
[ERROR] correlationId=ci-pr-1842-7f1e
[ERROR] request fixture: cardPool=shared-pan-pool token=tok_4832 accountState=USED_LAST_RUN
"""

XML_SAMPLE = """<ForwardAuthRequest>
  <CorrelationId>ci-pr-1842-7f1e</CorrelationId>
  <TransactionAmount currency="USD">42.00</TransactionAmount>
  <PaymentCredential>
    <Token>tok_4832</Token>
    <CardPool>shared-pan-pool</CardPool>
  </PaymentCredential>
</ForwardAuthRequest>
"""

CLAUDE_SUMMARY = """Category: Data fixture drift
Confidence: 86%
Hypothesis: the failing assertion is real, but the evidence points at reused auth data.
Fix: reserve a fresh card/token in scenario setup, attach the XML payload, and rerun isolated CI before defect routing.
"""

KARATE_FIX = """Feature: Forward Auth isolated approval path

  Background:
    * def reservedCard = call read('classpath:fixtures/reserve-card.feature')
    * def requestPayload = read('classpath:payloads/forward-auth.xml')
    * set requestPayload/ForwardAuthRequest/PaymentCredential/Token = reservedCard.token

  Scenario: approval response uses owned credential state
    Given url authBaseUrl
    And path '/forward-auth'
    And request requestPayload
    When method post
    Then status 200
    And match response.auth.responseCode == '00'
"""


def load_local_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw_value = line.split("=", 1)
        key = key.strip()
        value = raw_value.strip().strip("'\"")
        if key and key not in os.environ:
            os.environ[key] = value


def main() -> int:
    load_local_env()
    parser = argparse.ArgumentParser(description="Run the Forward Auth AI Agent terminal walkthrough.")
    parser.add_argument("--fast", action="store_true", help="Skip pauses and animations for quick rehearsals.")
    args = parser.parse_args()

    routing = route_root_cause_analysis()
    steps = build_steps(routing)
    if RICH_AVAILABLE:
        run_rich_walkthrough(steps, fast=args.fast)
    else:
        run_ansi_walkthrough(steps, fast=args.fast)
    return 0


def build_steps(routing: RoutingResult) -> list[DemoStep]:
    provider_note = f"Provider: {routing.provider}"
    if routing.model:
        provider_note += f" ({routing.model})"
    if routing.fallback_reason:
        provider_note += f"\nFallback note: {routing.fallback_reason}"

    return [
        DemoStep(
            "1. CI detects a Karate failure",
            "The workflow keeps the PR job alive long enough to collect artifacts, then hands the failure context to the agent.",
            LOG_SAMPLE,
            "text",
        ),
        DemoStep(
            "2. XML payload evidence is preserved",
            "The agent prompt wraps report fragments in XML tags so Claude can reason over logs, request payloads, and output contracts cleanly.",
            XML_SAMPLE,
            "xml",
        ),
        DemoStep(
            "3. Routed root-cause analysis runs server-side",
            "The walkthrough uses Anthropic first, Gemini second, and a deterministic simulation as the failsafe when no provider is configured.",
            f"{provider_note}\n\n{routing.text}",
            "text",
        ),
        DemoStep(
            "4. Deterministic fallback stays useful",
            "If both provider routes are unavailable, local taxonomy rules still produce a PR-safe markdown diagnosis.",
            "Fallback category rules: fixture drift, environment readiness, assertion drift, lifecycle fault, product regression candidate.",
            "text",
        ),
        DemoStep(
            "5. Suggested Karate fix",
            "The final comment gives engineers a concrete starting point without pretending the agent has merged code.",
            KARATE_FIX,
            "gherkin",
        ),
    ]


def route_root_cause_analysis() -> RoutingResult:
    prompt = build_root_cause_prompt()
    anthropic_result = try_anthropic(prompt)
    if anthropic_result:
        return anthropic_result

    gemini_result = try_gemini(prompt)
    if gemini_result:
        return gemini_result

    missing = []
    if not os.getenv("ANTHROPIC_API_KEY", "").strip():
        missing.append("ANTHROPIC_API_KEY was not set")
    if not os.getenv("GEMINI_API_KEY", "").strip():
        missing.append("GEMINI_API_KEY was not set")
    return RoutingResult(
        provider="simulation failsafe",
        model=None,
        text=CLAUDE_SUMMARY,
        fallback_reason="; ".join(missing) or "provider calls were unavailable",
    )


def build_root_cause_prompt() -> str:
    return "\n".join(
        [
            "<root_cause_request>",
            "<role>Forward Auth Karate CI root-cause analyst</role>",
            "<instructions>",
            "Analyze the failure evidence. Return a concise category, confidence, hypothesis, and fix.",
            "Use temperature 0 reasoning. Do not include secrets. Keep the answer PR-safe.",
            "</instructions>",
            "<failure_log>",
            escape_xml(LOG_SAMPLE),
            "</failure_log>",
            "<xml_payload>",
            escape_xml(XML_SAMPLE),
            "</xml_payload>",
            "</root_cause_request>",
        ]
    )


def try_anthropic(prompt: str) -> RoutingResult | None:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514").strip()
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model=model,
            max_tokens=700,
            temperature=0,
            system=(
                "<system>You produce concise, evidence-grounded Forward Auth CI root-cause "
                "analysis for pull request review.</system>"
            ),
            messages=[{"role": "user", "content": prompt}],
        )
        return RoutingResult(provider="Anthropic primary", model=model, text=extract_text_blocks(message))
    except Exception as exc:  # noqa: BLE001 - walkthrough should keep rehearsals moving.
        return RoutingResult(
            provider="simulation failsafe",
            model=None,
            text=CLAUDE_SUMMARY,
            fallback_reason=f"Anthropic route failed before Gemini fallback: {exc}",
        ) if not os.getenv("GEMINI_API_KEY", "").strip() else None


def try_gemini(prompt: str) -> RoutingResult | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        generation_config = {"temperature": 0, "max_output_tokens": 700}
        response = genai.GenerativeModel(model).generate_content(prompt, generation_config=generation_config)
        text = getattr(response, "text", "") or CLAUDE_SUMMARY
        return RoutingResult(provider="Gemini fallback", model=model, text=text.strip())
    except Exception as exc:  # noqa: BLE001 - final failsafe is the simulation.
        return RoutingResult(
            provider="simulation failsafe",
            model=None,
            text=CLAUDE_SUMMARY,
            fallback_reason=f"Gemini route failed: {exc}",
        )


def extract_text_blocks(message: object) -> str:
    blocks = getattr(message, "content", []) or []
    texts = [getattr(block, "text", "") for block in blocks if getattr(block, "type", "") == "text"]
    return "\n".join(text.strip() for text in texts if text.strip()) or CLAUDE_SUMMARY


def run_rich_walkthrough(steps: list[DemoStep], fast: bool) -> None:
    console = Console()
    console.clear()
    console.print(
        Panel.fit(
            "[bold white]Forward Auth AI Agent[/bold white]\n[cyan]Karate CI root-cause walkthrough[/cyan]",
            border_style="cyan",
            box=box.ROUNDED,
        )
    )
    pause("Press Enter to start the walkthrough", fast)

    for step in steps:
        console.print()
        console.print(Panel(step.body, title=f"[bold]{step.title}[/bold]", border_style="blue", box=box.ROUNDED))
        if step.artifact:
            console.print(Syntax(step.artifact.strip(), step.language, theme="ansi_dark", line_numbers=False, word_wrap=True))
        think(console, fast)
        pause("Press Enter for next step", fast)

    table = Table(title="Pull Request Output", box=box.SIMPLE_HEAVY)
    table.add_column("Section", style="cyan", no_wrap=True)
    table.add_column("What reviewers get", style="white")
    table.add_row("Evidence", "Signals copied from Karate logs and XML payloads")
    table.add_row("Diagnosis", "Category, confidence, hypothesis, and fallback note when applicable")
    table.add_row("Fix", "Suggested Karate isolation patch and validation plan")
    table.add_row("Safety", "No secrets, no browser-side API key, no hard failure when Maven is absent")
    console.print(table)
    console.print("\n[bold green]Walkthrough complete.[/bold green]")


def run_ansi_walkthrough(steps: list[DemoStep], fast: bool) -> None:
    width = shutil.get_terminal_size((92, 24)).columns
    print_box("Forward Auth AI Agent\nKarate CI root-cause walkthrough", width)
    pause("Press Enter to start the walkthrough", fast)

    for step in steps:
        print()
        print_box(f"{step.title}\n\n{step.body}", width)
        if step.artifact:
            print(indent(step.artifact.strip()))
        spin(fast)
        pause("Press Enter for next step", fast)

    print()
    print_box(
        "Pull Request Output\n\n"
        "- Evidence: signals copied from Karate logs and XML payloads\n"
        "- Diagnosis: category, confidence, hypothesis, and fallback note\n"
        "- Fix: suggested Karate isolation patch and validation plan\n"
        "- Safety: no secrets and no hard failure when Maven is absent",
        width,
    )
    print("\033[32mWalkthrough complete.\033[0m")


def think(console: "Console", fast: bool) -> None:
    if fast:
        return
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console, transient=True) as progress:
        task = progress.add_task("Agent processing evidence...", total=None)
        time.sleep(0.8)
        progress.update(task, description="Generating PR-safe markdown...")
        time.sleep(0.5)


def spin(fast: bool) -> None:
    if fast:
        return
    for label in ("Agent processing evidence", "Generating PR-safe markdown"):
        print(f"\033[36m{label}...\033[0m")
        time.sleep(0.5)


def pause(message: str, fast: bool) -> None:
    if fast:
        return
    if RICH_AVAILABLE:
        Prompt.ask(f"[dim]{message}[/dim]", default="", show_default=False)
    else:
        input(f"{message} ")


def print_box(text: str, width: int) -> None:
    inner_width = max(40, min(width - 4, 96))
    print("+" + "-" * (inner_width + 2) + "+")
    for raw_line in text.splitlines():
        wrapped = textwrap.wrap(raw_line, inner_width) or [""]
        for line in wrapped:
            print(f"| {line:<{inner_width}} |")
    print("+" + "-" * (inner_width + 2) + "+")


def indent(text: str) -> str:
    return "\n".join(f"    {line}" for line in text.splitlines())


def escape_xml(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


if __name__ == "__main__":
    raise SystemExit(main())
