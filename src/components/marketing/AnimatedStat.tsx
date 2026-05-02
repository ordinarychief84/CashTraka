'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** Target value the counter animates toward. */
  value: number;
  /** Optional suffix rendered after the number (e.g. "%", "+", "x"). */
  suffix?: string;
  /** Optional prefix (e.g. "₦"). */
  prefix?: string;
  /** Animation duration in ms. Default 1600. */
  duration?: number;
  /** How many decimals to render. Default 0. */
  decimals?: number;
  /** Render the target with locale-aware comma separators. Default true. */
  format?: boolean;
  className?: string;
};

/**
 * Count-up animation that fires once the element scrolls into view.
 *
 * Uses requestAnimationFrame and a soft ease-out curve so the number
 * eases into its destination instead of landing abruptly. Respects
 * `prefers-reduced-motion`, shows the final value immediately.
 */
export function AnimatedStat({
  value,
  prefix = '',
  suffix = '',
  duration = 1600,
  decimals = 0,
  format = true,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(value);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const startVal = 0;
    // easeOutQuart — fast start, soft landing
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setCurrent(startVal + (value - startVal) * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const display = format
    ? current.toLocaleString('en-NG', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : current.toFixed(decimals);

  return (
    <span ref={ref} className={cn('num tabular-nums', className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
