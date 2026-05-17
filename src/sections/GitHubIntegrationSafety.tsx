import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  GitMerge,
  GitPullRequest,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

const workflowSteps = [
  {
    title: 'Developer Opens a Branch',
    body: 'Work starts away from main so branch protection, review, and conflict prevention can operate before merge.',
    icon: GitBranch,
  },
  {
    title: 'Claude Code Proposes Locally',
    body: 'The Karate-focused agent drafts changes, explains evidence, and keeps the engineer in control of scope and acceptance.',
    icon: TerminalSquare,
  },
  {
    title: 'Pre-Push Safety Checks Run',
    body: 'Local gates run npm build, lint, optional tests, fetch origin/main, detect drift, and fail on likely merge conflicts.',
    icon: ShieldCheck,
  },
  {
    title: 'Pull Request CI Validates',
    body: 'GitHub Actions repeats install, lint, build, and optional tests so reviewers see consistent CI validation.',
    icon: GitPullRequest,
  },
  {
    title: 'Review Then Merge',
    body: 'Changes merge only after review, passing checks, and branch protection expectations are satisfied.',
    icon: GitMerge,
  },
];

const safetyChecks = [
  'npm run build',
  'npm run lint',
  'npm test if available',
  'git fetch origin main',
  'detect whether the branch is behind main',
  'warn if the push is likely to create merge conflicts',
  'block pushing if build, lint, tests, or conflict checks fail',
];

export default function GitHubIntegrationSafety() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.safety-reveal', {
        y: 28,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 72%',
          toggleActions: 'play none none none',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section ref={sectionRef} id="safety" className="bg-[#0B145A] py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-[4vw]">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="safety-reveal">
            <span className="section-eyebrow text-[#F7B600]">
              GitHub Integration & Safety Checks
            </span>
            <h2 className="section-title mt-3 text-white">
              Branch-based AI assistance with CI validation before merge.
            </h2>
          </div>
          <p className="safety-reveal text-lg font-light leading-relaxed text-[#DDE3EE]">
            The workflow keeps Claude Code engineer-in-the-loop: changes are proposed
            locally, checked before push, validated again in GitHub Actions, and merged
            only after review. The goal is production-grade regression workflow, not
            automatic commits or unsafe pushes.
          </p>
        </div>

        <div className="safety-reveal rounded-lg border border-white/12 bg-white/[0.04] p-4 md:p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="flex items-stretch gap-3 lg:block">
                  <article className="flex min-h-[220px] flex-1 flex-col rounded-lg border border-white/14 bg-white/[0.07] p-4">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-[#F7B600]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Icon className="h-5 w-5 text-[#F7B600]" />
                    </div>
                    <h3 className="text-lg font-semibold leading-snug text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm font-light leading-relaxed text-[#DDE3EE]">
                      {step.body}
                    </p>
                  </article>
                  {index < workflowSteps.length - 1 && (
                    <div className="flex items-center justify-center text-[#F7B600] lg:mt-4">
                      <ArrowRight className="h-5 w-5 rotate-90 lg:rotate-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <article className="safety-reveal rounded-lg border border-white/12 bg-white/[0.07] p-6">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-[#F7B600]" />
              <h3 className="text-xl font-semibold text-white">Pre-Push Gate</h3>
            </div>
            <p className="text-base font-light leading-relaxed text-[#DDE3EE]">
              The local script exits on errors, never pushes, never auto-resolves
              conflicts, and gives engineers a clear warning when the branch is behind
              origin/main or likely to collide at merge time.
            </p>
          </article>

          <div className="safety-reveal grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {safetyChecks.map((check) => (
              <div
                key={check}
                className="rounded-lg border border-white/12 bg-white/[0.07] px-4 py-3"
              >
                <p className="font-mono text-xs leading-relaxed text-white">{check}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
