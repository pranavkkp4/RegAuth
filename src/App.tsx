import { useEffect, useRef } from 'react';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from './sections/Navigation';
import Hero from './sections/Hero';
import EngineeringProblem from './sections/EngineeringProblem';
import ProgramFocus from './sections/ProgramFocus';
import ReliabilityMetrics from './sections/ReliabilityMetrics';
import ClaudeAgentDesign from './sections/ClaudeAgentDesign';
import TestIsolationStrategy from './sections/TestIsolationStrategy';
import GitHubIntegrationSafety from './sections/GitHubIntegrationSafety';
import Timeline from './sections/Timeline';
import ProductionDeliverables from './sections/ProductionDeliverables';
import Resources from './sections/Resources';
import Footer from './sections/Footer';
import { useReducedMotion } from './hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const lenisRef = useRef<Lenis | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      return;
    }

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [prefersReducedMotion]);

  return (
    <div className="relative">
      <Navigation lenisRef={lenisRef} />
      <Hero />
      <EngineeringProblem />
      <ProgramFocus />
      <ReliabilityMetrics />
      <ClaudeAgentDesign />
      <TestIsolationStrategy />
      <GitHubIntegrationSafety />
      <Timeline />
      <ProductionDeliverables />
      <Resources />
      <Footer />
    </div>
  );
}
