import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  /** How much to float (px). Default 8. */
  distance?: number;
  /** Seconds per cycle. Default 4. */
  speed?: number;
  /** Delay before the first cycle (s). Useful when several Floats are visible. */
  delay?: number;
  className?: string;
};

/**
 * Gently oscillating wrapper — drops in a hero mockup or feature card so it
 * "breathes" while idle. Pure CSS keyframe animation; respects
 * `prefers-reduced-motion` via the global rule in globals.css.
 */
export function FloatingCard({
  children,
  distance = 8,
  speed = 4,
  delay = 0,
  className,
}: Props) {
  return (
    <div
      className={cn('animate-float will-change-transform', className)}
      style={
        {
          '--float-distance': `${distance}px`,
          '--float-speed': `${speed}s`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
