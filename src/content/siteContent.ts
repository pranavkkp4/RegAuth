import {
  AlertTriangle,
  Bot,
  Braces,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  DatabaseZap,
  FileCode2,
  Gauge,
  GitBranch,
  LineChart,
  ListChecks,
  Network,
  ShieldCheck,
  Split,
  TerminalSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CardItem = {
  title: string;
  body: string;
  eyebrow?: string;
  metric?: string;
  icon?: LucideIcon;
};

export type TimelineItem = {
  phase: string;
  title: string;
  description: string;
};

export type ResourceItem = {
  title: string;
  body: string;
  href: string;
};

export type NavItem = {
  label: string;
  href: string;
};

export type AgentWorkflowId = 'classify' | 'author' | 'isolate' | 'validate';

export type AgentWorkflowOption = {
  id: AgentWorkflowId;
  label: string;
  body: string;
};

export type AgentSampleFailure = {
  label: string;
  log: string;
};

export const navLinks: NavItem[] = [
  { label: 'Problem', href: '#problem' },
  { label: 'Objectives', href: '#objectives' },
  { label: 'Metrics', href: '#metrics' },
  { label: 'Agent', href: '#agent' },
  { label: 'Isolation', href: '#isolation' },
  { label: 'Safety', href: '#safety' },
  { label: 'Deliverables', href: '#deliverables' },
];

export const sectionIds = [
  'hero',
  'problem',
  'objectives',
  'metrics',
  'agent',
  'isolation',
  'safety',
  'timeline',
  'deliverables',
  'resources',
];

export const heroMetrics: CardItem[] = [
  {
    metric: '<5%',
    title: 'First-Run Flake Rate',
    body: 'Target for non-SQL Forward Auth failures after root-cause reduction, not rerun masking.',
  },
  {
    metric: '100%',
    title: 'Independent Execution',
    body: 'Any selected Karate scenario should run alone with deterministic setup, teardown, and data ownership.',
  },
  {
    metric: 'Human-gated',
    title: 'AI Test Authoring',
    body: 'Claude Code proposes Karate changes locally while engineers retain review, CI, and merge authority.',
  },
];

export const engineeringProblemCards: CardItem[] = [
  {
    title: 'Low Signal on First Run',
    body: 'Flaky non-SQL failures diluted regression confidence and slowed release decisions.',
    icon: AlertTriangle,
  },
  {
    title: 'Hidden State Coupling',
    body: 'Implicit data dependencies created Karate scenarios that passed in suite order but failed independently.',
    icon: DatabaseZap,
  },
  {
    title: 'Unclassified Failures',
    body: 'Logs needed failure classification before engineers could separate product defects from harness, data, and environment issues.',
    icon: Crosshair,
  },
];

export const reliabilityMetrics: CardItem[] = [
  {
    metric: '<5%',
    title: 'First-Run Reliability',
    body: 'Reduce flaky non-SQL failures below the target by fixing root causes instead of hiding instability with reruns.',
    icon: Gauge,
  },
  {
    metric: '0 hidden deps',
    title: 'Deterministic Execution',
    body: 'Track whether selected scenarios can execute independently without inherited account, token, card, or transaction state.',
    icon: ShieldCheck,
  },
  {
    metric: 'Taxonomy',
    title: 'Root-Cause Taxonomy',
    body: 'Classify failures by data, environment, framework, assertion, dependency, and true product regression.',
    icon: GitBranch,
  },
  {
    metric: 'CI gate',
    title: 'Failure Classification',
    body: 'Tie every remediation path to CI validation, branch protection, and engineer review before merge.',
    icon: ClipboardCheck,
  },
];

export const programPillars: CardItem[] = [
  {
    eyebrow: '01',
    title: 'Measurable Stability Improvements',
    body: 'Reduce the Forward Auth regression suite flaky test rate to below 5% on first-run execution for non-SQL failures. The work emphasizes root-cause reduction, failure classification, and visible trend reporting instead of masking failures with reruns.',
  },
  {
    eyebrow: '02',
    title: 'Claude Code Agent With Karate Skills',
    body: 'Package a Claude Code toolkit for authoring new Karate tests, maintaining existing coverage, and debugging failures through CLAUDE.md guidance, reusable slash commands, test templates, and reviewable diagnostics.',
  },
  {
    eyebrow: '03',
    title: 'Production-Grade Test Isolation',
    body: 'Make any selected test runnable independently by removing prior-state assumptions, formalizing setup and teardown, controlling deterministic test data, and checking environment readiness before execution.',
  },
];

export const agentDesignCards: CardItem[] = [
  {
    title: 'CLAUDE.md',
    body: 'Repository-local operating guidance covering Forward Auth context, Karate conventions, safe edit boundaries, and the evidence required before recommending changes.',
    icon: FileCode2,
  },
  {
    title: 'Slash Commands',
    body: 'Task-specific commands for failure triage, scenario generation, log summarization, deterministic setup checks, and debug workflow handoffs.',
    icon: TerminalSquare,
  },
  {
    title: 'Karate Test Templates',
    body: 'Reusable feature, Background, assertion, data-fixture, setup, and teardown patterns that keep authored tests aligned with the suite architecture.',
    icon: Braces,
  },
  {
    title: 'Engineer-In-The-Loop AI',
    body: 'Claude Code proposes local changes and explains tradeoffs, but engineers approve scope, run checks, open pull requests, and own merge decisions.',
    icon: Bot,
  },
];

export const agentWorkflowOptions: AgentWorkflowOption[] = [
  {
    id: 'classify',
    label: 'Classify',
    body: 'Assign taxonomy and evidence.',
  },
  {
    id: 'author',
    label: 'Author',
    body: 'Draft a Karate-safe fix path.',
  },
  {
    id: 'isolate',
    label: 'Isolate',
    body: 'Check hidden state coupling.',
  },
  {
    id: 'validate',
    label: 'Validate',
    body: 'Build the CI review plan.',
  },
];

export const agentSampleFailures: AgentSampleFailure[] = [
  {
    label: 'Data drift',
    log: [
      'ForwardAuthRegression.feature:142',
      'match failed: expected approved response code but actual was 05',
      'card pool returned expired PAN after token refresh',
      'account state reused from previous scenario',
    ].join('\n'),
  },
  {
    label: 'Readiness',
    log: [
      'Karate request timeout after 30000 ms',
      'dependency health check reported unavailable',
      'gateway returned 503 during Forward Auth setup',
    ].join('\n'),
  },
  {
    label: 'Framework',
    log: [
      'java.lang.NullPointerException in BeforeFeature hook',
      'karate.callSingle cache returned null token',
      'scenario failed before authorization payload was submitted',
    ].join('\n'),
  },
];

export const isolationStrategyCards: CardItem[] = [
  {
    title: 'Explicit State Ownership',
    body: 'Scenarios create, reserve, or validate their own card, account, token, and transaction prerequisites instead of borrowing state from previous tests.',
    icon: ShieldCheck,
  },
  {
    title: 'Deterministic Test Data',
    body: 'Static assumptions are replaced with explicit fixtures, setup APIs, unique identifiers, teardown discipline, and clear preconditions.',
    icon: ListChecks,
  },
  {
    title: 'Environment Readiness',
    body: 'Dependency health, token freshness, configuration drift, and service availability are checked before failures are classified as product regressions.',
    icon: Split,
  },
];

export const timelineItems: TimelineItem[] = [
  {
    phase: 'Phase 01',
    title: 'Baseline First-Run Reliability',
    description:
      'Map Forward Auth flows, identify high-volume Karate paths, and establish a reproducible non-SQL instability baseline.',
  },
  {
    phase: 'Phase 02',
    title: 'Instrument and Classify Failures',
    description:
      'Capture structured failure metadata, classify root causes, and surface trends in a stability dashboard.',
  },
  {
    phase: 'Phase 03',
    title: 'Refactor Isolation Hotspots',
    description:
      'Remove ordering dependencies, harden fixtures, and make failure reproduction deterministic in local and CI runs.',
  },
  {
    phase: 'Phase 04',
    title: 'Build the Karate Agent Toolkit',
    description:
      'Package Claude Code instructions, slash commands, templates, and evaluation criteria for engineer-supervised use.',
  },
  {
    phase: 'Phase 05',
    title: 'Validate, Protect, and Hand Off',
    description:
      'Run historical evaluations, document branch protection and CI validation expectations, and hand over production-ready deliverables.',
  },
];

export const productionDeliverables: CardItem[] = [
  {
    title: 'Stability Dashboard',
    body: 'A metrics view that tracks first-run flaky rate, failure classes, isolation coverage, and recurring suite hotspots.',
    icon: LineChart,
  },
  {
    title: 'Failure Classification System',
    body: 'Instrumentation and labels that turn regression failures into actionable root-cause categories.',
    icon: Network,
  },
  {
    title: 'Karate Agent Toolkit',
    body: 'CLAUDE.md guidance, slash commands, prompts, debug workflows, and templates built for Forward Auth test authoring.',
    icon: Bot,
  },
  {
    title: 'Isolation Refactor Plan',
    body: 'A prioritized remediation plan for coupled tests, shared state, data lifecycle gaps, and parallel execution blockers.',
    icon: CheckCircle2,
  },
  {
    title: 'Engineer Runbook',
    body: 'Operating guidance for triage, agent usage, review expectations, GitHub safety checks, CI validation, and long-term ownership.',
    icon: ClipboardCheck,
  },
  {
    title: 'GitHub Safety Workflow',
    body: 'A CI workflow, local pre-push check, and documentation that enforce branch-based review, merge conflict prevention, and protected validation.',
    icon: GitBranch,
  },
];

export const resources: ResourceItem[] = [
  {
    title: 'Claude Code Documentation',
    body: 'Reference for repository instructions, command workflows, and AI-assisted engineering review loops.',
    href: 'https://docs.anthropic.com/en/docs/claude-code',
  },
  {
    title: 'Karate Framework',
    body: 'Primary framework reference for API test authoring, fixtures, assertions, and feature-file structure.',
    href: 'https://karatelabs.io/',
  },
  {
    title: 'ISO 8583 and ISO 20022',
    body: 'Messaging standards context for card authorization flows and financial transaction payloads.',
    href: 'https://www.iso.org/standards.html',
  },
];
