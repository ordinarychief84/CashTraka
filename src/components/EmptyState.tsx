import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * Shared empty state. Tightened to match the dashboard design system:
 * smaller, lower-visual-weight tile that doesn't dominate the layout —
 * the actionable button stays prominent without overwhelming the page.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: Props) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 p-8 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon size={22} strokeWidth={1.75} />
        </div>
      )}
      <div className="max-w-md">
        <h3 className="text-base font-bold text-ink md:text-lg">{title}</h3>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {(actionHref || secondaryHref) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {actionHref && actionLabel && (
            <Link href={actionHref} className="btn-pill-primary">
              {actionLabel}
            </Link>
          )}
          {secondaryHref && secondaryLabel && (
            <Link href={secondaryHref} className="btn-pill-ghost">
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
