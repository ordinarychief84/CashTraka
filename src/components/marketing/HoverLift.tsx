import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Adds a soft brand-coloured glow on hover. Default true. */
  glow?: boolean;
};

/**
 * Generic hover-lift wrapper for cards.
 *
 * Adds a subtle upward translate and a soft ring-glow in the brand colour
 * on hover. Built on plain CSS transitions so it doesn't require client
 * JS, safe to drop inside server components.
 */
export function HoverLift({ children, className, glow = true }: Props) {
  return (
    <div
      className={cn(
        'group h-full transition duration-300 ease-out',
        'hover:-translate-y-1',
        glow && 'hover:[&>*]:shadow-[0_10px_28px_-12px_rgba(0,184,232,0.35)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
