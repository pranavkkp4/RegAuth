import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type Lenis from '@studio-freight/lenis';
import { navLinks, sectionIds } from '../content/siteContent';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface NavigationProps {
  lenisRef: MutableRefObject<Lenis | null>;
}

export default function Navigation({ lenisRef }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const prefersReducedMotion = useReducedMotion();

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 40);

    for (let index = sectionIds.length - 1; index >= 0; index -= 1) {
      const element = document.getElementById(sectionIds[index]);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      if (rect.top <= 140) {
        setActiveSection(sectionIds[index]);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollTo = (href: string) => {
    const target = href.replace('#', '');

    if (lenisRef.current) {
      lenisRef.current.scrollTo(`#${target}`, { offset: -76 });
      return;
    }

    document
      .getElementById(target)
      ?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-[#DDE3EE] bg-white/88 shadow-[0_12px_32px_rgba(11,20,90,0.06)] backdrop-blur-xl'
          : 'border-transparent bg-white/55 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-[4vw]">
        <button
          type="button"
          onClick={() => scrollTo('#hero')}
          className="font-mono text-sm font-medium uppercase tracking-[0.12em] text-[#1A1F71]"
        >
          RegAuth
        </button>
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => {
            const sectionId = link.href.replace('#', '');
            const isActive = activeSection === sectionId;

            return (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollTo(link.href)}
                className={`relative pb-1 text-sm transition-colors ${
                  isActive ? 'text-[#1A1F71]' : 'text-[#667085] hover:text-[#1A1F71]'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F7B600]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
