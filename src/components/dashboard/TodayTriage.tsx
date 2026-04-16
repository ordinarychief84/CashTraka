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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "Today" triage — the first block on the dashboard.
 *
 * Unifies what were previously two banners + a priority list into a single
 * ranked queue. Rules:
 *   - Items are sorted by money impact (highest first) but critical security
 *     issues (unverified payments) always pin to the top.
 *   - Shows up to 5 items; the rest hide behind a "View all" link.
 *   - If nothing is burning, shows a quiet empty state.
 *
 * This is the only place the owner should need to look at the start of the day.
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
  { chip: string; ring: string; iconWrap: string }
> = {
  critical: {
    chip: 'bg-red-600 text-white',
    ring: 'ring-red-100',
    iconWrap: 'bg-red-50 text-red-600',
  },
  warning: {
    chip: 'bg-amber-500 text-white',
    ring: 'ring-amber-100',
    iconWrap: 'bg-amber-50 text-amber-700',
  },
  info: {
    chip: 'bg-slate-500 text-white',
    ring: 'ring-slate-100',
    iconWrap: 'bg-slate-50 text-slate-600',
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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
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
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-bold text-ink">
          Today&apos;s priorities
          {criticalCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
              {criticalCount}
            </span>
          )}
        </h2>
        <span className="text-[11px] font-semibold text-slate-500">
          {ranked.length} {ranked.length === 1 ? 'item' : 'items'}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {visible.map((item) => {
          const style = SEVERITY_STYLE[item.severity];
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-4',
                    style.iconWrap,
                    style.ring,
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">
                      {item.title}
                    </span>
                    {item.severity === 'critical' && (
                      <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Critical
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                  )}
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-400" />
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
};
