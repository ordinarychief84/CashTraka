import Link from 'next/link';
import {
  AlertTriangle,
  Clock3,
  PauseCircle,
  UserX,
  ChevronRight,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Admin "needs attention" triage list. Shows platform-level items that
 * require an owner/operator to act on, past-due billings, trials ending,
 * suspended users, and anything else worth surfacing.
 */

type Severity = 'critical' | 'warning' | 'info';

export type AdminTriageItem = {
  id: string;
  severity: Severity;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
};

const SEV: Record<Severity, { ring: string; wrap: string; badge: string }> = {
  critical: {
    ring: 'ring-red-100',
    wrap: 'bg-red-50 text-red-700',
    badge: 'bg-red-600 text-white',
  },
  warning: {
    ring: 'ring-owed-100',
    wrap: 'bg-owed-50 text-owed-700',
    badge: 'bg-owed-500 text-white',
  },
  info: {
    ring: 'ring-slate-100',
    wrap: 'bg-slate-100 text-slate-700',
    badge: 'bg-slate-500 text-white',
  },
};

export function AdminTriage({ items }: { items: AdminTriageItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Nothing needs attention</h2>
            <p className="text-xs text-slate-500">
              No past-due subscriptions, no trials expiring soon, no suspensions.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const critical = items.filter((i) => i.severity === 'critical').length;

  return (
    <section className="card overflow-hidden p-0">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <AlertTriangle size={15} className="text-owed-600" />
          Needs attention
          {critical > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
              {critical}
            </span>
          )}
        </h2>
        <span className="text-[11px] font-semibold text-slate-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const sev = SEV[item.severity];
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
                    sev.wrap,
                    sev.ring,
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">
                      {item.title}
                    </span>
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
    </section>
  );
}

export const AdminTriageIcons = {
  pastDue: AlertTriangle,
  trialExpiring: Clock3,
  suspended: PauseCircle,
  zeroActivity: UserX,
};
