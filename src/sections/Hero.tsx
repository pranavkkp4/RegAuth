import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { heroMetrics } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

export default function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const kickerRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const words = titleRef.current?.querySelectorAll('.blur-reveal-word');
      if (words) {
        gsap.set(words, { filter: 'blur(10px)', opacity: 0 });
        gsap.to(words, {
          filter: 'blur(0px)',
          opacity: 1,
          duration: 1.1,
          stagger: 0.045,
          ease: 'power2.out',
          delay: 0.15,
        });
      }

      gsap.from([kickerRef.current, subtitleRef.current], {
        y: 20,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: 'power2.out',
      });

      const cards = cardsRef.current?.querySelectorAll('.info-card');
      if (cards) {
        gsap.from(cards, {
          y: 28,
          opacity: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: 'power2.out',
          delay: 0.65,
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  const titleWords =
    'RegAuth: Forward Auth Regression Test Robustness & AI-Assisted Test Authoring'.split(
      ' '
    );

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-[100dvh] w-full overflow-hidden bg-[#F5F7FA]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(11,20,90,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(11,20,90,0.045)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white to-transparent" />
      <div className="absolute bottom-0 right-0 h-[55%] w-[55%] bg-[radial-gradient(circle_at_bottom_right,rgba(247,182,0,0.16),transparent_58%)]" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col justify-center px-[4vw] pb-12 pt-28">
        <div ref={kickerRef} className="mb-6 flex flex-wrap items-center gap-3">
          <span className="h-px w-10 bg-[#F7B600]" />
          <span className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-[#1A1F71]">
            Portfolio Case Study
          </span>
        </div>

        <h1
          ref={titleRef}
          className="font-display mb-6 max-w-[1120px] leading-[1.02] text-[#0B145A]"
          style={{ fontSize: 'clamp(42px, 6.6vw, 104px)' }}
        >
          {titleWords.map((word, index) => (
            <span
              key={`${word}-${index}`}
              className="blur-reveal-word inline-block mr-[0.22em]"
            >
              {word}
            </span>
          ))}
        </h1>

        <p
          ref={subtitleRef}
          className="font-body max-w-[760px] text-xl font-light leading-relaxed text-[#344054]"
        >
          A production-focused transformation of Forward Auth regression testing:
          measurable reliability, deterministic execution, root-cause analysis,
          and an engineer-in-the-loop Claude Code workflow for Karate authoring.
        </p>

        <div ref={cardsRef} className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {heroMetrics.map((card) => (
            <div
              key={card.title}
              className="info-card rounded-lg border border-[#DDE3EE] bg-white/90 p-5 shadow-[0_16px_40px_rgba(11,20,90,0.08)] backdrop-blur"
            >
              <div className="font-mono mb-2 text-2xl font-medium text-[#1A1F71]">
                {card.metric}
              </div>
              <div className="font-body mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#0B145A]">
                {card.title}
              </div>
              <p className="font-body text-sm font-light leading-relaxed text-[#475467]">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
