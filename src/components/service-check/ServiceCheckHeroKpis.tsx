import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ThumbsUp,
  Star,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

const RATING_SCORE: Record<string, number> = {
  VERY_HAPPY: 5,
  HAPPY: 4,
  UNHAPPY: 2,
  VERY_UNHAPPY: 1,
};

/**
 * 6 KPI tiles across the top of /service-check:
 *   Total Service Checks · Completed Checks · Pending Feedback ·
 *   Negative Feedback · Positive Rating % · Avg Satisfaction Score
 *
 * "Service Check" = Feedback row. Wired to real Feedback data.
 */
export async function ServiceCheckHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    total,
    totalPrev,
    completed,
    completedPrev,
    pending,
    negative,
    negativePrev,
    submittedRows,
  ] = await Promise.all([
    prisma.feedback.count({ where: { userId } }),
    prisma.feedback.count({
      where: { userId, createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.feedback.count({
      where: { userId, submittedAt: { not: null } },
    }),
    prisma.feedback.count({
      where: {
        userId,
        submittedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.feedback.count({
      where: {
        userId,
        submittedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    }),
    prisma.feedback.count({
      where: { userId, isNegative: true, submittedAt: { not: null } },
    }),
    prisma.feedback.count({
      where: {
        userId,
        isNegative: true,
        submittedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.feedback.findMany({
      where: { userId, submittedAt: { not: null } },
      select: { rating: true },
    }),
  ]);

  const positive = submittedRows.filter(
    (r) => r.rating === 'VERY_HAPPY' || r.rating === 'HAPPY',
  ).length;
  const positivePct =
    submittedRows.length > 0
      ? Math.round((positive / submittedRows.length) * 100)
      : null;
  const scores = submittedRows
    .map((r) => RATING_SCORE[r.rating])
    .filter((s): s is number => typeof s === 'number');
  const avgScore =
    scores.length > 0 ? scores.reduce((s, n) => s + n, 0) / scores.length : null;

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
    invert?: boolean;
  }[] = [
    {
      label: 'Total Service Checks',
      value: total.toLocaleString('en-NG'),
      delta: pctDelta(total, totalPrev),
      deltaLabel: 'vs last week',
      Icon: ClipboardCheck,
      iconTone: 'brand',
    },
    {
      label: 'Completed Checks',
      value: completed.toLocaleString('en-NG'),
      delta: pctDelta(completed, completedPrev),
      deltaLabel: 'vs last week',
      Icon: CheckCircle2,
      iconTone: 'success',
    },
    {
      label: 'Pending Feedback',
      value: pending.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'awaiting response',
      Icon: Clock,
      iconTone: 'owed',
      invert: true,
    },
    {
      label: 'Negative Feedback',
      value: negative.toLocaleString('en-NG'),
      delta: pctDelta(negative, negativePrev),
      deltaLabel: 'vs last week',
      Icon: AlertTriangle,
      iconTone: 'rose',
      invert: true,
    },
    {
      label: 'Positive Rating %',
      value: positivePct == null ? '—' : `${positivePct}%`,
      delta: null,
      deltaLabel: 'across submissions',
      Icon: ThumbsUp,
      iconTone: 'success',
    },
    {
      label: 'Avg Satisfaction',
      value: avgScore == null ? '—' : `${avgScore.toFixed(1)} / 5`,
      delta: null,
      deltaLabel: 'mean rating',
      Icon: Star,
      iconTone: 'owed',
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
                (t.invert ? t.delta < 0 : t.delta >= 0)
                  ? 'text-success-700'
                  : 'text-rose-600',
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
