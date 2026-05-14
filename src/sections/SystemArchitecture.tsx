import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import { architectureFlow } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function SystemArchitecture() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.flow-node', {
        x: -18,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
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
    <section ref={sectionRef} id="architecture" className="bg-[#0B145A] py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-[4vw]">
        <div className="mb-12 max-w-[820px]">
          <span className="section-eyebrow text-[#F7B600]">System Architecture</span>
          <h2 className="section-title mt-3 text-white">
            Failure data moves from raw suite output to reviewed CI validation.
          </h2>
        </div>

        <div className="rounded-lg border border-white/12 bg-white/[0.04] p-4 md:p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
            {architectureFlow.map((step, index) => (
              <div key={step} className="flow-node flex items-stretch gap-3 lg:block">
                <div className="flex min-h-[112px] flex-1 flex-col justify-between rounded-lg border border-white/14 bg-white/[0.07] p-4">
                  <span className="font-mono text-xs text-[#F7B600]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 text-base font-medium leading-snug text-white">{step}</h3>
                </div>
                {index < architectureFlow.length - 1 && (
                  <div className="flex items-center justify-center text-[#F7B600] lg:mt-4">
                    <ArrowRight className="h-5 w-5 rotate-90 lg:rotate-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
