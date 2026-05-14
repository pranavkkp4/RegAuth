import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reliabilityMetrics } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function ReliabilityMetrics() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.metric-card', {
        y: 30,
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
    <section ref={sectionRef} id="metrics" className="bg-[#F5F7FA] py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-[4vw]">
        <div className="mb-12 max-w-[820px]">
          <span className="section-eyebrow">Reliability Metrics</span>
          <h2 className="section-title mt-3">The case study starts with measurable signal quality.</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {reliabilityMetrics.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="metric-card case-card">
                {Icon && <Icon className="mb-5 h-6 w-6 text-[#1A1F71]" />}
                <p className="font-mono text-2xl font-medium text-[#F7B600]">{card.metric}</p>
                <h3 className="card-title mt-3">{card.title}</h3>
                <p className="card-body">{card.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
