'use client';

import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { Reveal } from './Reveal';

type Props = {
  /** Children to animate sequentially. Each direct child becomes a Reveal. */
  children: ReactNode;
  /** ms between each child's start. Default 80ms. */
  step?: number;
  /** First child's delay in ms. Default 0. */
  initialDelay?: number;
  /** Pass-through props to every Reveal wrapper. */
  from?: 'up' | 'down' | 'left' | 'right' | 'zoom' | 'none';
  distance?: number;
  duration?: number;
  className?: string;
};

/**
 * Stagger wrapper, applies an incrementing delay to each direct child so a
 * grid of cards animates in one-at-a-time rather than all at once. If a
 * child is already a `<Reveal>`, its `delay` prop is overridden with the
 * computed stagger value; otherwise the child is wrapped.
 *
 *   <Stagger step={100}>
 *     <Card /> <Card /> <Card />
 *   </Stagger>
 */
export function Stagger({
  children,
  step = 80,
  initialDelay = 0,
  from = 'up',
  distance,
  duration,
  className,
}: Props) {
  const kids = Children.toArray(children);
  return (
    <div className={className}>
      {kids.map((child, i) => {
        const delay = initialDelay + i * step;
        if (isValidElement(child) && child.type === Reveal) {
          // Preserve any other props already on it, just override delay.
          return cloneElement(child as React.ReactElement<{ delay?: number }>, {
            key: child.key ?? i,
            delay,
          });
        }
        return (
          <Reveal
            key={i}
            delay={delay}
            from={from}
            distance={distance}
            duration={duration}
          >
            {child}
          </Reveal>
        );
      })}
    </div>
  );
}
