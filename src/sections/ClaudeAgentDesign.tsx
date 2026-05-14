import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { agentDesignCards } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';
import AgentConsole from './AgentConsole';

gsap.registerPlugin(ScrollTrigger);

export default function ClaudeAgentDesign() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.agent-card', {
        y: 32,
        opacity: 0,
        duration: 0.65,
        stagger: 0.1,
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
    <section ref={sectionRef} id="agent" className="bg-[#F5F7FA] py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-[4vw]">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="section-eyebrow">Claude Code Agent Design</span>
            <h2 className="section-title mt-3">AI assistance stays scoped, measurable, and reviewable.</h2>
          </div>
          <p className="text-lg font-light leading-relaxed text-[#344054]">
            The agent is designed as an engineering assistant for Karate authoring and
            failure triage. It proposes changes, explains evidence, and routes every
            recommendation through human review plus CI validation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {agentDesignCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="agent-card case-card">
                {Icon && <Icon className="mb-5 h-6 w-6 text-[#1A1F71]" />}
                <h3 className="card-title">{card.title}</h3>
                <p className="card-body">{card.body}</p>
              </article>
            );
          })}
        </div>

        <AgentConsole />
      </div>
    </section>
  );
}
