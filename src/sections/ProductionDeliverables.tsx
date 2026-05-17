import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { productionDeliverables } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function ProductionDeliverables() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.deliverable-card', {
        y: 30,
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
    <section ref={sectionRef} id="deliverables" className="bg-[#F5F7FA] py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-[4vw]">
        <div className="mb-12 max-w-[840px]">
          <span className="section-eyebrow">Production Deliverables</span>
          <h2 className="section-title mt-3">Artifacts built for maintainers, not demos.</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {productionDeliverables.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="deliverable-card case-card">
                {Icon && <Icon className="mb-5 h-6 w-6 text-[#1A1F71]" />}
                <h3 className="card-title">{card.title}</h3>
                <p className="card-body">{card.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
