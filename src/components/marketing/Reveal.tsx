'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Direction = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'none';

type Props = {
  children: React.ReactNode;
  /** Start delay in ms, use `Stagger` below for multi-child sequences. */
  delay?: number;
  /** Distance travelled (or scale start when `zoom`). Bigger = more drama. */
  distance?: number;
  /** Direction the element travels from before it settles. */
  from?: Direction;
  /** Override the default easing. Defaults to a soft overshoot cubic-bezier. */
  easing?: string;
  /** Duration in ms. Default 700. */
  duration?: number;
  /** Blur (px) applied to hidden state, Connecteam-style dreamy enter. */
  blur?: boolean;
  className?: string;
};

/**
 * Scroll-triggered entrance animation.
 *
 * IntersectionObserver + CSS transitions, no animation library. Respects
 * `prefers-reduced-motion`. One-shot: reveals the first time the element
 * crosses the viewport, then detaches the observer.
 *
 * Pair with `Stagger` (below) when animating multiple siblings so delays
 * are computed automatically.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 24,
  from = 'up',
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)', // soft-ease-out-expo
  duration = 700,
  blur = false,
  className,
}: Props) {
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
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden: React.CSSProperties = (() => {
    switch (from) {
      case 'up':
        return { transform: `translate3d(0, ${distance}px, 0)` };
      case 'down':
        return { transform: `translate3d(0, -${distance}px, 0)` };
      case 'left':
        return { transform: `translate3d(-${distance}px, 0, 0)` };
      case 'right':
        return { transform: `translate3d(${distance}px, 0, 0)` };
      case 'zoom':
        return { transform: `scale(${1 - distance / 200})` };
      case 'none':
      default:
        return {};
    }
  })();

  const style: React.CSSProperties = {
    transition: `transform ${duration}ms ${easing} ${delay}ms, opacity ${duration}ms ${easing} ${delay}ms, filter ${duration}ms ${easing} ${delay}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate3d(0, 0, 0) scale(1)' : hidden.transform,
    filter: blur && !visible ? 'blur(6px)' : 'blur(0)',
    willChange: visible ? 'auto' : 'transform, opacity',
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
