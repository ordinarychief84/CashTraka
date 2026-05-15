import {
  Users,
  UserCheck,
  UserPlus,
  Building2,
  ClipboardCheck,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

/**
 * 6 KPI tiles across the top of /team:
 *   Total Team Members · Active Members · New This Month · Departments ·
 *   Tasks Completed This Week · Avg Performance
 */
export async function TeamHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    total,
    totalPrev,
    active,
    newThisMonth,
    departments,
    tasksCompleted,
    tasksCompletedPrev,
    tasksTotalWeek,
  ] = await Promise.all([
    prisma.staffMember.count({ where: { userId, status: 'active' } }),
    prisma.staffMember.count({
      where: {
        userId,
        status: 'active',
        createdAt: { lt: weekStart },
      },
    }),
    prisma.staffMember.count({
      where: { userId, status: 'active' },
    }),
    prisma.staffMember.count({
      where: { userId, status: 'active', createdAt: { gte: monthStart } },
    }),
    prisma.staffMember.groupBy({
      by: ['role'],
      where: { userId, status: 'active' },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: {
        userId,
        status: 'done',
        completedAt: { gte: weekStart },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: 'done',
        completedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        OR: [
          { completedAt: { gte: weekStart } },
          { createdAt: { gte: weekStart } },
        ],
      },
    }),
  ]);

  const performance =
    tasksTotalWeek > 0 ? Math.round((tasksCompleted / tasksTotalWeek) * 100) : null;

  const pctDelta = (cur: number, prev: number): number | null => {
    if (prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const tiles: {
    label: string;
    value: string;
    delta: number | null;
    deltaLabel: string;
    Icon: LucideIcon;
    iconTone: 'brand' | 'success' | 'owed' | 'rose' | 'slate';
  }[] = [
    {
      label: 'Total Team Members',
      value: total.toLocaleString('en-NG'),
      delta: pctDelta(total, totalPrev),
      deltaLabel: 'vs last week',
      Icon: Users,
      iconTone: 'brand',
    },
    {
      label: 'Active Members',
      value: active.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: `${total > 0 ? Math.round((active / total) * 100) : 0}% of all`,
      Icon: UserCheck,
      iconTone: 'success',
    },
    {
      label: 'New This Month',
      value: newThisMonth.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'since start of month',
      Icon: UserPlus,
      iconTone: 'brand',
    },
    {
      label: 'Departments',
      value: departments.length.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'distinct roles',
      Icon: Building2,
      iconTone: 'owed',
    },
    {
      label: 'Tasks Completed (Week)',
      value: tasksCompleted.toLocaleString('en-NG'),
      delta: pctDelta(tasksCompleted, tasksCompletedPrev),
      deltaLabel: 'vs last week',
      Icon: ClipboardCheck,
      iconTone: 'success',
    },
    {
      label: 'Avg Performance',
      value: performance == null ? '—' : `${performance}%`,
      delta: null,
      deltaLabel: 'completion rate',
      Icon: TrendingUp,
      iconTone: 'success',
    },
  ];

  const ICON_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    owed: 'bg-owed-50 text-owed-700',
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-border bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {t.label}
              </div>
              <div className="num mt-2 truncate text-[26px] font-black leading-tight text-ink md:text-[28px]">
                {t.value}
              </div>
            </div>
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                ICON_BG[t.iconTone],
              )}
            >
              <t.Icon size={16} />
            </span>
          </div>
          {t.delta !== null ? (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold',
                t.delta >= 0 ? 'text-success-700' : 'text-rose-600',
              )}
            >
              {t.delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {Math.abs(t.delta)}% {t.deltaLabel}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-500">{t.deltaLabel}</div>
          )}
        </div>
      ))}
    </section>
  );
}
