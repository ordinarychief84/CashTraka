'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  /** Direction the element travels from before it settles. */
  from?: 'up' | 'left' | 'right' | 'none';
};

/**
 * Fade + slide into view the first time this element intersects the viewport.
 * Pure CSS transition, IntersectionObserver-driven — no animation library.
 */
export function Reveal({ children, delay = 0, className, from = 'up' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect reduced-motion — just show immediately.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hiddenTransform =
    from === 'up' ? 'translate-y-6'
    : from === 'left' ? '-translate-x-6'
    : from === 'right' ? 'translate-x-6'
    : '';

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        visible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${hiddenTransform}`,
        className,
      )}
    >
      {children}
    </div>
  );
}
