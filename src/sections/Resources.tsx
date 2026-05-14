import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExternalLink } from 'lucide-react';
import { resources } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function Resources() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.resource-card', {
        y: 26,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 76%',
          toggleActions: 'play none none none',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section ref={sectionRef} id="resources" className="bg-white py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1200px] px-[4vw]">
        <div className="mb-12 max-w-[760px]">
          <span className="section-eyebrow">Resources</span>
          <h2 className="section-title mt-3">Primary references behind the implementation approach.</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {resources.map((card) => (
            <a
              key={card.title}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="resource-card case-card group block"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="card-title">{card.title}</h3>
                <ExternalLink className="h-5 w-5 shrink-0 text-[#667085] transition-colors group-hover:text-[#F7B600]" />
              </div>
              <p className="card-body">{card.body}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
