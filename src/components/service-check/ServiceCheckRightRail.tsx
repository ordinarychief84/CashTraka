import Link from 'next/link';
import {
  AlertTriangle,
  Plus,
  Send,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { timeAgo } from '@/lib/format';

/**
 * Service Check page right rail:
 *   1. Customer Satisfaction Overview — Excellent / Good / Fair / Poor
 *      buckets derived from the 4 rating values
 *   2. Upcoming Follow-Ups — top 5 unresolved negative feedback rows
 *   3. Quick Actions
 */
export async function ServiceCheckRightRail({ userId }: { userId: string }) {
  const [submitted, followUps] = await Promise.all([
    prisma.feedback.findMany({
      where: { userId, submittedAt: { not: null } },
      select: { rating: true },
    }),
    prisma.feedback.findMany({
      where: {
        userId,
        isNegative: true,
        isResolved: false,
        submittedAt: { not: null },
      },
      orderBy: { submittedAt: 'asc' },
      take: 5,
      select: {
        id: true,
        rating: true,
        submittedAt: true,
        reason: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  const buckets = {
    excellent: submitted.filter((s) => s.rating === 'VERY_HAPPY').length,
    good: submitted.filter((s) => s.rating === 'HAPPY').length,
    fair: submitted.filter((s) => s.rating === 'UNHAPPY').length,
    poor: submitted.filter((s) => s.rating === 'VERY_UNHAPPY').length,
  };

  return (
    <div className="space-y-4">
      <SatisfactionOverviewCard buckets={buckets} />
      <UpcomingFollowUpsCard rows={followUps} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Customer Satisfaction Overview ============== */

function SatisfactionOverviewCard({
  buckets,
}: {
  buckets: { excellent: number; good: number; fair: number; poor: number };
}) {
  const total =
    buckets.excellent + buckets.good + buckets.fair + buckets.poor;

  const rows: { label: string; count: number; tone: string; bar: string }[] = [
    {
      label: 'Excellent',
      count: buckets.excellent,
      tone: 'bg-success-100 text-success-700',
      bar: 'bg-success-500',
    },
    {
      label: 'Good',
      count: buckets.good,
      tone: 'bg-brand-50 text-brand-700',
      bar: 'bg-brand-500',
    },
    {
      label: 'Fair',
      count: buckets.fair,
      tone: 'bg-owed-50 text-owed-700',
      bar: 'bg-owed-500',
    },
    {
      label: 'Poor',
      count: buckets.poor,
      tone: 'bg-rose-50 text-rose-700',
      bar: 'bg-rose-500',
    },
  ];

  return (
    <DashboardCard title="Customer Satisfaction Overview" viewAllHref="/service-check">
      {total === 0 ? (
        <p className="py-1 text-xs text-slate-500">
          No submitted feedback yet — request feedback after a sale.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.label}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.tone}`}>
                    {r.label}
                  </span>
                  <span className="num font-semibold text-ink">
                    {r.count}{' '}
                    <span className="text-slate-400">({pct}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${r.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Upcoming Follow-Ups ============== */

const REASON_LABEL: Record<string, string> = {
  DELAY: 'Delay',
  WRONG_ITEM: 'Wrong item',
  POOR_SERVICE: 'Poor service',
  PAYMENT_ISSUE: 'Payment issue',
  OTHER: 'Other',
};

function UpcomingFollowUpsCard({
  rows,
}: {
  rows: {
    id: string;
    rating: string;
    submittedAt: Date | null;
    reason: string | null;
    customer: { name: string } | null;
  }[];
}) {
  return (
    <DashboardCard title="Upcoming Follow-Ups" viewAllHref="/service-check">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">No unresolved negative feedback.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/service-check/${r.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                  <AlertTriangle size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.customer?.name ?? 'Customer'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {REASON_LABEL[r.reason ?? 'OTHER'] ?? r.reason ?? 'Negative feedback'}
                    {r.submittedAt ? ` · ${timeAgo(r.submittedAt)}` : ''}
                  </div>
                </div>
              </Link>
              <span className="num shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                Action
              </span>
            </li>
          ))}
        </ul>
      )}
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
    { Icon: Plus, label: 'New Check', href: '/service-check', tone: 'brand' },
    { Icon: Send, label: 'Request Feedback', href: '/service-check', tone: 'success' },
    { Icon: CalendarDays, label: 'Follow-Up Schedule', href: '/service-check', tone: 'owed' },
    { Icon: BarChart3, label: 'Service Report', href: '/reports', tone: 'rose' },
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
