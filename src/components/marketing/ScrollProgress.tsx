'use client';

import { useEffect, useState } from 'react';

/**
 * Thin top-of-page progress bar. Tracks how far the user has scrolled
 * through the whole landing page. Very subtle — 2px high, cyan gradient,
 * sits above the navbar.
 *
 * Intentionally lightweight: passive scroll listener + CSS width transition.
 */
export function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return setPct(0);
      setPct(Math.min(100, (window.scrollY / max) * 100));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-success-500 transition-[width] duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
