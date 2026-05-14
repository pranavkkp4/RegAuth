import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { engineeringProblemCards } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function EngineeringProblem() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.problem-reveal', {
        y: 28,
        opacity: 0,
        duration: 0.7,
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
    <section ref={sectionRef} id="problem" className="bg-white py-[96px] md:py-[120px]">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-[4vw] lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="problem-reveal">
          <span className="section-eyebrow">Engineering Problem</span>
          <h2 className="section-title mt-3">
            Regression failures were too expensive to trust at face value.
          </h2>
        </div>

        <div className="space-y-6">
          <p className="problem-reveal text-xl font-light leading-relaxed text-[#344054]">
            Forward Auth regression health depends on fast signal quality. A failed
            Karate run should tell engineers whether a product behavior changed, test
            data drifted, infrastructure moved, or the automation harness leaked state.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {engineeringProblemCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="problem-reveal case-card">
                  {Icon && <Icon className="mb-4 h-6 w-6 text-[#1A1F71]" />}
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-body">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
