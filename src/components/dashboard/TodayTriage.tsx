import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Package,
  Users2,
  CreditCard,
  Send,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "Today" triage — the first block on the dashboard.
 *
 * Softer than the previous loud-red version. Severity is now expressed as a
 * left-edge accent strip + a small dot + the icon tint, rather than a bright
 * CRITICAL badge. Makes the dashboard feel like a calm command centre, not a
 * fire alarm, while still making urgent items scannable.
 */

type Severity = 'critical' | 'warning' | 'info';

export type TriageItem = {
  id: string;
  severity: Severity;
  /** Lucide icon component. */
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
  /** Sort helper. In naira; higher = more urgent when tied in severity. */
  moneyImpact?: number;
};

const SEVERITY_STYLE: Record<
  Severity,
  {
    accent: string;
    iconWrap: string;
    dot: string;
    label: string;
    labelText: string;
  }
> = {
  critical: {
    accent: 'bg-red-500',
    iconWrap: 'bg-red-50 text-red-600',
    dot: 'bg-red-500',
    label: 'Urgent',
    labelText: 'text-red-600',
  },
  warning: {
    accent: 'bg-owed-400',
    iconWrap: 'bg-owed-50 text-owed-700',
    dot: 'bg-owed-400',
    label: 'Soon',
    labelText: 'text-owed-700',
  },
  info: {
    accent: 'bg-slate-300',
    iconWrap: 'bg-slate-50 text-slate-600',
    dot: 'bg-slate-300',
    label: 'Note',
    labelText: 'text-slate-500',
  },
};

export function TodayTriage({ items }: { items: TriageItem[] }) {
  // Rank: critical first, then warning, then info. Within each group, sort
  // by moneyImpact descending.
  const sevOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  const ranked = [...items].sort((a, b) => {
    const s = sevOrder[a.severity] - sevOrder[b.severity];
    if (s !== 0) return s;
    return (b.moneyImpact ?? 0) - (a.moneyImpact ?? 0);
  });
  const visible = ranked.slice(0, 5);
  const criticalCount = ranked.filter((r) => r.severity === 'critical').length;

  if (ranked.length === 0) {
    return (
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100 text-success-700">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">You&apos;re all caught up</h2>
            <p className="text-xs text-slate-500">
              Nothing urgent right now. Good time to log today&apos;s sales.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden p-0">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <ListChecks size={15} className="text-slate-400" />
          Today&apos;s priorities
          {criticalCount > 0 && (
            <span className="ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-50 px-1.5 text-[10px] font-bold text-red-600 ring-1 ring-red-100">
              {criticalCount}
            </span>
          )}
        </h2>
        <span className="text-[11px] font-semibold text-slate-400">
          {ranked.length} {ranked.length === 1 ? 'item' : 'items'}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {visible.map((item) => {
          const style = SEVERITY_STYLE[item.severity];
          const Icon = item.icon;
          return (
            <li key={item.id} className="relative">
              {/* Left-edge accent */}
              <span
                aria-hidden
                className={cn('absolute inset-y-0 left-0 w-0.5', style.accent)}
              />
              <Link
                href={item.href}
                className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    style.iconWrap,
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">
                      {item.title}
                    </span>
                    <span
                      className={cn(
                        'hidden shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide sm:inline-flex',
                        style.labelText,
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                      {style.label}
                    </span>
                  </div>
                  {item.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </Link>
            </li>
          );
        })}
      </ul>
      {ranked.length > visible.length && (
        <footer className="border-t border-border bg-slate-50/60 px-5 py-2 text-center">
          <span className="text-[11px] text-slate-500">
            + {ranked.length - visible.length} more{' '}
            {ranked.length - visible.length === 1 ? 'item' : 'items'} in the backlog
          </span>
        </footer>
      )}
    </section>
  );
}

// Convenience icon mapping exported so callers can pick consistent icons.
export const TriageIcons = {
  unverified: ShieldAlert,
  overdue: AlertTriangle,
  followUp: MessageCircle,
  dormant: Sparkles,
  lowStock: Package,
  teamPay: Users2,
  paylink: CreditCard,
  paylinkPending: Send,
};
