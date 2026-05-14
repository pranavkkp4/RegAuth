import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { timelineItems } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function Timeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.timeline-item', {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section ref={sectionRef} id="timeline" className="bg-[#0B145A] py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1200px] px-[4vw]">
        <div className="mb-14 max-w-[820px]">
          <span className="section-eyebrow text-[#F7B600]">Timeline</span>
          <h2 className="section-title mt-3 text-white">From baseline measurement to production handoff.</h2>
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-[15px] top-0 w-px bg-white/16 md:left-1/2" />
          <div className="space-y-8">
            {timelineItems.map((item, index) => {
              const isLeft = index % 2 === 0;
              return (
                <article
                  key={item.title}
                  className="timeline-item relative grid grid-cols-[32px_1fr] gap-4 md:grid-cols-[1fr_32px_1fr]"
                >
                  <div
                    className={`rounded-lg border border-white/12 bg-white/[0.06] p-5 md:row-start-1 ${
                      isLeft
                        ? 'md:col-start-1 md:text-right'
                        : 'md:col-start-3'
                    }`}
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#F7B600]">
                      {item.phase}
                    </span>
                    <h3 className="mt-2 text-xl font-medium text-white">{item.title}</h3>
                    <p className="mt-3 text-base font-light leading-relaxed text-[#DDE3EE]">
                      {item.description}
                    </p>
                  </div>
                  <div className="relative z-10 col-start-1 row-start-1 mt-2 h-8 w-8 rounded-full border border-[#F7B600] bg-[#0B145A] md:col-start-2" />
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
