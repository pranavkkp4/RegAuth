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
  Layers3,
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
  { label: 'Metrics', href: '#metrics' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Agent', href: '#agent' },
  { label: 'Deliverables', href: '#deliverables' },
];

export const sectionIds = [
  'hero',
  'problem',
  'metrics',
  'architecture',
  'program',
  'agent',
  'isolation',
  'timeline',
  'deliverables',
  'resources',
];

export const heroMetrics: CardItem[] = [
  {
    metric: '<5%',
    title: 'Flaky Test Rate',
    body: 'Target state for non-SQL Forward Auth regressions after isolation and failure classification.',
  },
  {
    metric: '100%',
    title: 'Isolation Coverage',
    body: 'Each scenario can run independently with deterministic setup, teardown, and data ownership.',
  },
  {
    metric: '6-stage',
    title: 'Failure Triage',
    body: 'Instrumentation and taxonomy connect suite failures to agent-assisted remediation.',
  },
];

export const engineeringProblemCards: CardItem[] = [
  {
    title: 'Noisy Failures',
    body: 'Flake and environment noise made real authorization regressions harder to isolate.',
    icon: AlertTriangle,
  },
  {
    title: 'Shared State',
    body: 'Implicit data dependencies created tests that passed in sequence but failed alone.',
    icon: DatabaseZap,
  },
  {
    title: 'Slow Triage',
    body: 'Logs needed classification before fixes, agent suggestions, or CI gates could be trusted.',
    icon: Crosshair,
  },
];

export const reliabilityMetrics: CardItem[] = [
  {
    metric: '<5%',
    title: 'Flaky Test Rate Target',
    body: 'Drive recurring non-product failures below the threshold through root-cause fixes, not rerun masking.',
    icon: Gauge,
  },
  {
    metric: '100%',
    title: 'Isolation Coverage',
    body: 'Refactor coupled tests until setup, account state, and card data are owned by the scenario under test.',
    icon: ShieldCheck,
  },
  {
    metric: 'Taxonomy',
    title: 'Failure Taxonomy',
    body: 'Classify failures by data, environment, framework, assertion, dependency, and true product regression.',
    icon: GitBranch,
  },
  {
    metric: 'Eval set',
    title: 'Agent Evaluation',
    body: 'Measure Claude Code suggestions against historical failures before any engineer adopts generated changes.',
    icon: ClipboardCheck,
  },
];

export const architectureFlow = [
  'Regression Suite',
  'Failure Instrumentation Layer',
  'Failure Classifier',
  'Root-Cause Taxonomy',
  'Claude Code Karate Agent',
  'Engineer Review + CI Validation',
];

export const programPillars: CardItem[] = [
  {
    eyebrow: '01',
    title: 'Measurement Discipline',
    body: 'Baseline Forward Auth regression health with repeatable metrics, failure signatures, and trend reporting that separates product regressions from harness instability.',
  },
  {
    eyebrow: '02',
    title: 'Root-Cause Taxonomy',
    body: 'Convert raw logs and stack traces into a shared vocabulary for data, environment, assertion, dependency, framework, and service behavior failures.',
  },
  {
    eyebrow: '03',
    title: 'Deterministic Execution',
    body: 'Eliminate hidden ordering dependencies so every Karate scenario can run alone, in parallel, and in CI without inherited state.',
  },
  {
    eyebrow: '04',
    title: 'Engineer-In-The-Loop AI',
    body: 'Design a Claude Code workflow that proposes Karate fixes, templates, and diagnostics while keeping engineers responsible for review and merge decisions.',
  },
  {
    eyebrow: '05',
    title: 'CI Validation',
    body: 'Close the loop with gated validation: generated changes are checked against historical failure cases and confirmed by standard build pipelines.',
  },
];

export const agentDesignCards: CardItem[] = [
  {
    title: 'CLAUDE.md',
    body: 'Repository-local operating guidance covering Forward Auth context, Karate conventions, safe edit boundaries, and expected evidence before suggesting changes.',
    icon: FileCode2,
  },
  {
    title: 'Slash Commands',
    body: 'Task-specific commands for failure triage, scenario generation, log summarization, and deterministic setup checks.',
    icon: TerminalSquare,
  },
  {
    title: 'Karate Templates',
    body: 'Reusable feature, background, assertion, and data-fixture patterns that keep generated tests aligned with the suite architecture.',
    icon: Braces,
  },
  {
    title: 'Historical Failure Evaluation',
    body: 'An evaluation set built from known suite failures to score whether agent recommendations are accurate, scoped, and reviewable.',
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
    title: 'State Ownership',
    body: 'Scenarios create or reserve their own card, account, token, and transaction prerequisites instead of borrowing state from previous tests.',
    icon: Layers3,
  },
  {
    title: 'Deterministic Fixtures',
    body: 'Static assumptions are replaced with explicit fixtures, setup APIs, and clear preconditions that make failures diagnosable.',
    icon: ListChecks,
  },
  {
    title: 'Parallel Safety',
    body: 'Shared pools, mutable identifiers, and cleanup routines are hardened so the suite can scale across CI workers without cross-test interference.',
    icon: Split,
  },
];

export const timelineItems: TimelineItem[] = [
  {
    phase: 'Phase 01',
    title: 'Baseline the Regression Surface',
    description:
      'Map Forward Auth flows, identify high-volume Karate paths, and establish a reproducible instability baseline.',
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
    title: 'Validate and Hand Off',
    description:
      'Run historical evaluations, document operational runbooks, and hand over CI-ready deliverables to maintainers.',
  },
];

export const productionDeliverables: CardItem[] = [
  {
    title: 'Stability Dashboard',
    body: 'A metrics view that tracks flaky rate, failure classes, isolation coverage, and recurring suite hotspots.',
    icon: LineChart,
  },
  {
    title: 'Failure Classification System',
    body: 'Instrumentation and labels that turn regression failures into actionable root-cause categories.',
    icon: Network,
  },
  {
    title: 'Karate Agent Toolkit',
    body: 'Claude Code guidance, slash commands, prompts, and templates built for Forward Auth test authoring.',
    icon: Bot,
  },
  {
    title: 'Isolation Refactor Plan',
    body: 'A prioritized remediation plan for coupled tests, shared state, data lifecycle gaps, and parallel execution blockers.',
    icon: CheckCircle2,
  },
  {
    title: 'Engineer Runbook',
    body: 'Operating guidance for triage, agent usage, review expectations, CI validation, and long-term ownership.',
    icon: ClipboardCheck,
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
