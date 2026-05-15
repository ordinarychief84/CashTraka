import Link from 'next/link';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Reports page right rail:
 *   1. Financial Summary (This Week) — Revenue / Expenses / Net Profit / Profit Margin / Cash Balance
 *   2. Recent Reports — last 5 CSV exports (synthetic list keyed off live data sources)
 */
export async function ReportsRightRail({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [revenue, expenses, outstandingRows] = await Promise.all([
    prisma.payment.aggregate({
      where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
      _sum: { amountKobo: true },
    }),
    prisma.expense.aggregate({
      where: { userId, kind: 'business', incurredOn: { gte: weekStart } },
      _sum: { amountKobo: true },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: { totalKobo: true, amountPaidKobo: true },
    }),
  ]);

  const revenueKobo = revenue._sum.amountKobo ?? 0;
  const expensesKobo = expenses._sum.amountKobo ?? 0;
  const netProfit = revenueKobo - expensesKobo;
  const margin = revenueKobo > 0 ? Math.round((netProfit / revenueKobo) * 100) : null;
  const outstandingKobo = outstandingRows.reduce(
    (s, i) => s + Math.max(0, i.totalKobo - i.amountPaidKobo),
    0,
  );

  return (
    <div className="space-y-4">
      <FinancialSummaryCard
        revenueKobo={revenueKobo}
        expensesKobo={expensesKobo}
        netProfit={netProfit}
        margin={margin}
        outstandingKobo={outstandingKobo}
      />
      <RecentReportsCard />
    </div>
  );
}

/* ============== Financial Summary ============== */

function FinancialSummaryCard({
  revenueKobo,
  expensesKobo,
  netProfit,
  margin,
  outstandingKobo,
}: {
  revenueKobo: number;
  expensesKobo: number;
  netProfit: number;
  margin: number | null;
  outstandingKobo: number;
}) {
  const rows: { label: string; value: string; tone: 'success' | 'rose' | 'brand' | 'owed' | 'slate'; Icon: typeof TrendingUp }[] = [
    {
      label: 'Total Revenue',
      value: formatKobo(revenueKobo),
      tone: 'success',
      Icon: TrendingUp,
    },
    {
      label: 'Total Expenses',
      value: formatKobo(expensesKobo),
      tone: 'rose',
      Icon: TrendingDown,
    },
    {
      label: 'Net Profit',
      value: formatKobo(netProfit),
      tone: netProfit >= 0 ? 'success' : 'rose',
      Icon: Banknote,
    },
    {
      label: 'Profit Margin',
      value: margin == null ? '—' : `${margin}%`,
      tone: 'brand',
      Icon: TrendingUp,
    },
    {
      label: 'Outstanding',
      value: formatKobo(outstandingKobo),
      tone: 'owed',
      Icon: Wallet,
    },
  ];

  const TONE_TEXT: Record<string, string> = {
    success: 'text-success-700',
    rose: 'text-rose-700',
    brand: 'text-brand-700',
    owed: 'text-owed-700',
    slate: 'text-slate-700',
  };
  const TONE_BG: Record<string, string> = {
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    brand: 'bg-brand-50 text-brand-700',
    owed: 'bg-owed-50 text-owed-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <DashboardCard title="Financial Summary (This Week)">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  TONE_BG[r.tone],
                )}
              >
                <r.Icon size={14} />
              </span>
              <span className="text-xs font-semibold text-slate-600">{r.label}</span>
            </div>
            <span className={cn('num shrink-0 text-sm font-bold', TONE_TEXT[r.tone])}>
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}

/* ============== Recent Reports ============== */

function RecentReportsCard() {
  const today = new Date().toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const reports: { label: string; href: string }[] = [
    { label: 'Sales Summary Report', href: '/api/export/payments' },
    { label: 'Purchase Summary Report', href: '/api/export/expenses' },
    { label: 'Inventory Summary Report', href: '/api/export/customers' },
    { label: 'Payment Summary Report', href: '/api/export/payments' },
    { label: 'Customer Summary Report', href: '/api/export/customers' },
  ];

  return (
    <DashboardCard title="Recent Reports" viewAllHref="/reports">
      <ul className="space-y-2.5">
        {reports.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <Link
              href={r.href}
              className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <FileText size={14} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {r.label}
                </div>
                <div className="text-[10px] text-slate-500">{today}</div>
              </div>
            </Link>
            <a
              href={r.href}
              download
              className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
              aria-label="Download CSV"
            >
              <Download size={14} />
            </a>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
