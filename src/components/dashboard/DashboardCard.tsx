import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared dashboard widget shell. Wraps a card with the standard header
 * pattern shown in every panel: title on the left, optional "View all"
 * link on the right, optional period dropdown.
 *
 * Body content slots inside; the card handles its own border, padding,
 * and corner radius so callers stay focused on the data.
 */
export function DashboardCard({
  title,
  viewAllHref,
  viewAllLabel = 'View all',
  rightSlot,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-white p-5 shadow-xs',
        className,
      )}
    >
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {rightSlot
          ? rightSlot
          : viewAllHref && (
              <Link
                href={viewAllHref}
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-700 hover:underline"
              >
                {viewAllLabel}
                <ArrowRight size={12} />
              </Link>
            )}
      </header>
      <div className={cn('flex-1 min-h-0', bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Period pill used in card right-slots ("This Week", "This Month").
 * Static visual — wire to client state from the parent when needed.
 */
export function PeriodPill({ label = 'This Week' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
      {label}
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="text-slate-400">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
