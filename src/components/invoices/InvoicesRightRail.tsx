import Link from 'next/link';
import {
  Clock,
  Users,
  Plus,
  Send,
  Bell,
  Banknote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';

/**
 * Invoices page right rail:
 *   1. Aging Summary    — outstanding amount bucketed by days overdue
 *   2. Top Customers    — top 5 by total invoiced
 *   3. Quick Actions    — 4 icon tiles
 */
export async function InvoicesRightRail({ userId }: { userId: string }) {
  const liveStatuses = ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'];

  const [outstandingRows, topCustomers] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId, status: { in: liveStatuses } },
      select: { totalKobo: true, amountPaidKobo: true, dueDate: true },
    }),
    prisma.invoice.groupBy({
      by: ['customerName'],
      where: {
        userId,
        status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
      },
      _sum: { totalKobo: true },
      _count: { _all: true },
      orderBy: { _sum: { totalKobo: 'desc' } },
      take: 5,
    }),
  ]);

  // Bucket outstanding amounts by days overdue.
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const buckets = { current: 0, b1to30: 0, b31to60: 0, b61to90: 0, over90: 0 };
  for (const inv of outstandingRows) {
    const remaining = Math.max(0, inv.totalKobo - inv.amountPaidKobo);
    if (remaining === 0) continue;
    if (!inv.dueDate || new Date(inv.dueDate).getTime() >= now) {
      buckets.current += remaining;
      continue;
    }
    const days = Math.floor((now - new Date(inv.dueDate).getTime()) / dayMs);
    if (days <= 30) buckets.b1to30 += remaining;
    else if (days <= 60) buckets.b31to60 += remaining;
    else if (days <= 90) buckets.b61to90 += remaining;
    else buckets.over90 += remaining;
  }

  return (
    <div className="space-y-4">
      <AgingSummaryCard buckets={buckets} />
      <TopCustomersCard rows={topCustomers} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Aging Summary ============== */

function AgingSummaryCard({
  buckets,
}: {
  buckets: {
    current: number;
    b1to30: number;
    b31to60: number;
    b61to90: number;
    over90: number;
  };
}) {
  const rows: { label: string; value: number; tone: string }[] = [
    { label: 'Current (not due)', value: buckets.current, tone: 'bg-success-100 text-success-700' },
    { label: '1 – 30 days', value: buckets.b1to30, tone: 'bg-owed-100 text-owed-800' },
    { label: '31 – 60 days', value: buckets.b31to60, tone: 'bg-owed-200 text-owed-800' },
    { label: '61 – 90 days', value: buckets.b61to90, tone: 'bg-rose-100 text-rose-700' },
    { label: 'Over 90 days', value: buckets.over90, tone: 'bg-rose-200 text-rose-800' },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <DashboardCard title="Aging Summary" viewAllHref="/invoices">
      <div className="mb-3">
        <div className="num text-xl font-black text-ink">{formatKobo(total)}</div>
        <div className="text-[11px] text-slate-500">Outstanding receivables</div>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
          return (
            <li key={r.label}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">{r.label}</span>
                <span className="num font-semibold text-ink">
                  {formatKobo(r.value)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${r.tone}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}

/* ============== Top Customers ============== */

function TopCustomersCard({
  rows,
}: {
  rows: { customerName: string; _sum: { totalKobo: number | null }; _count: { _all: number } }[];
}) {
  return (
    <DashboardCard title="Top Customers" viewAllHref="/customers">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">No invoiced customers yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Users size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.customerName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {r._count._all} invoice{r._count._all === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <span className="num shrink-0 text-xs font-bold text-ink">
                {formatKobo(r._sum.totalKobo ?? 0)}
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
    { Icon: Plus, label: 'New Invoice', href: '/invoices/new', tone: 'brand' },
    { Icon: Send, label: 'Send Invoice', href: '/invoices', tone: 'success' },
    { Icon: Bell, label: 'Send Reminder', href: '/invoices', tone: 'owed' },
    { Icon: Banknote, label: 'Record Payment', href: '/payments/new', tone: 'rose' },
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
