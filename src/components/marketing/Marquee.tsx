import { cn } from '@/lib/utils';

type Props = {
  items: React.ReactNode[];
  /** Seconds per full cycle. Larger = slower. */
  speed?: number;
  className?: string;
};

/**
 * Infinite horizontal marquee. Duplicates the track so the loop is seamless.
 * Uses the `animate-marquee` keyframes defined in globals.css.
 */
export function Marquee({ items, speed = 40, className }: Props) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        // Soft fade on the edges so the loop feels continuous
        '[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]',
        className,
      )}
    >
      <div
        className="flex w-max animate-marquee gap-3 py-1"
        style={{ animationDuration: `${speed}s` }}
      >
        {items.map((it, i) => (
          <span key={`a-${i}`} className="shrink-0">{it}</span>
        ))}
        {items.map((it, i) => (
          <span key={`b-${i}`} aria-hidden className="shrink-0">{it}</span>
        ))}
      </div>
    </div>
  );
}
