import Link from 'next/link';
import {
  Cake,
  Plus,
  ShieldCheck,
  KeyRound,
  BarChart3,
  Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { cn } from '@/lib/utils';

/**
 * Team page right rail:
 *   1. Department Breakdown — bar list of staff per role with percentage
 *   2. Upcoming Birthdays  — kept as placeholder/empty (DOB not in schema)
 *   3. Quick Actions
 */
export async function TeamRightRail({ userId }: { userId: string }) {
  const grouped = await prisma.staffMember.groupBy({
    by: ['role'],
    where: { userId, status: 'active' },
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const PALETTE = [
    'bg-brand-500',
    'bg-success-500',
    'bg-owed-500',
    'bg-rose-500',
    'bg-violet-400',
    'bg-slate-400',
  ];

  const total = grouped.reduce((s, g) => s + g._count._all, 0);
  const rows = grouped.map((g, i) => ({
    label: g.role && g.role.length > 0 ? g.role : 'Unassigned',
    count: g._count._all,
    color: PALETTE[i % PALETTE.length],
    pct: total > 0 ? Math.round((g._count._all / total) * 100) : 0,
  }));

  return (
    <div className="space-y-4">
      <DepartmentBreakdownCard rows={rows} />
      <UpcomingBirthdaysCard />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Department Breakdown ============== */

function DepartmentBreakdownCard({
  rows,
}: {
  rows: { label: string; count: number; color: string; pct: number }[];
}) {
  return (
    <DashboardCard title="Department Breakdown" viewAllHref="/team">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">No active team members.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Building2 size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{r.label}</div>
                    <div className="text-[10px] text-slate-500">
                      {r.count} member{r.count === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <span className="num shrink-0 text-xs font-bold text-slate-700">
                  {r.pct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('h-full rounded-full', r.color)}
                  style={{ width: `${r.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Upcoming Birthdays ============== */

function UpcomingBirthdaysCard() {
  return (
    <DashboardCard title="Upcoming Birthdays" viewAllHref="/team">
      <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-owed-50 text-owed-700">
          <Cake size={18} />
        </span>
        <p className="text-xs text-slate-500">
          Birthdays will appear here once you add date-of-birth to team profiles.
        </p>
      </div>
    </DashboardCard>
  );
}

/* ============== Quick Actions ============== */

function QuickActionsCard() {
  const actions: {
    Icon: LucideIcon;
    label: string;
    href: string;
    tone: 'brand' | 'success' | 'owed' | 'rose';
  }[] = [
    { Icon: Plus, label: 'Add Member', href: '/team/new', tone: 'brand' },
    { Icon: ShieldCheck, label: 'Manage Roles', href: '/settings', tone: 'success' },
    { Icon: KeyRound, label: 'Permissions', href: '/settings', tone: 'owed' },
    { Icon: BarChart3, label: 'Team Report', href: '/reports', tone: 'rose' },
  ];

  const TONE_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    success: 'bg-success-100 text-success-700 hover:bg-success-200',
    owed: 'bg-owed-50 text-owed-700 hover:bg-owed-100',
    rose: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  };

  return (
    <DashboardCard title="Quick Actions">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white p-3 transition hover:bg-slate-50"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_BG[a.tone]}`}
            >
              <a.Icon size={16} />
            </span>
            <span className="text-[10px] font-semibold text-slate-700">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
