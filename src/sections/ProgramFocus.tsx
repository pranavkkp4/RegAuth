import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { programPillars } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function ProgramFocus() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const currentTab = programPillars[activeTab];

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current.children, {
          y: 28,
          opacity: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        });
      }

      if (tabsRef.current) {
        gsap.from(tabsRef.current, {
          y: 28,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: tabsRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !contentRef.current) return;

    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
    );
  }, [activeTab, prefersReducedMotion]);

  return (
    <section ref={sectionRef} id="program" className="bg-white py-[96px] md:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-[4vw]">
        <div ref={headerRef} className="mb-10 max-w-[820px]">
          <span className="section-eyebrow">Program Focus</span>
          <h2 className="section-title mt-3">Five case-study pillars for production reliability.</h2>
        </div>

        <div ref={tabsRef} className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 lg:grid-cols-1">
            {programPillars.map((tab, index) => (
              <button
                key={tab.title}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  activeTab === index
                    ? 'border-[#F7B600] bg-[#FFF9E8]'
                    : 'border-[#DDE3EE] bg-white hover:border-[#B8C2D6]'
                }`}
              >
                <span className="font-mono text-xs text-[#667085]">{tab.eyebrow}</span>
                <span className="mt-2 block text-sm font-semibold text-[#0B145A]">
                  {tab.title}
                </span>
              </button>
            ))}
          </div>

          <div
            ref={contentRef}
            className="rounded-lg border border-[#DDE3EE] bg-[#F5F7FA] p-6 md:p-8"
          >
            <span className="font-mono text-sm text-[#F7B600]">{currentTab.eyebrow}</span>
            <h3 className="font-display mt-4 text-3xl leading-tight text-[#1A1F71] md:text-5xl">
              {currentTab.title}
            </h3>
            <p className="mt-5 max-w-[780px] text-lg font-light leading-relaxed text-[#344054]">
              {currentTab.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
