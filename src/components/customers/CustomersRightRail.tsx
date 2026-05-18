import Link from 'next/link';
import {
  Users,
  ShoppingBag,
  Banknote,
  FileText,
  Plus,
  Send,
  Download,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { formatKobo, timeAgo } from '@/lib/format';

/**
 * Customers page right rail:
 *   1. Top Customers (This Week)   — top 5 by paid amount
 *   2. Recent Customer Activity   — 5 most recent customer touchpoints
 *      (latest payments + new invoices, merged + sorted by time)
 *   3. Quick Actions
 */
export async function CustomersRightRail({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [topByPayment, recentPayments, recentInvoices, recentCustomers] = await Promise.all([
    prisma.payment.groupBy({
      by: ['customerNameSnapshot'],
      where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
      _sum: { amountKobo: true },
      orderBy: { _sum: { amountKobo: 'desc' } },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { userId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        customerNameSnapshot: true,
        amountKobo: true,
        createdAt: true,
        customerId: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        status: true,
        createdAt: true,
        dueDate: true,
        totalKobo: true,
        amountPaidKobo: true,
      },
    }),
    prisma.customer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
  ]);

  const activity: ActivityRow[] = [
    ...recentPayments.map((p): ActivityRow => ({
      key: `pay-${p.id}`,
      Icon: Banknote,
      tone: 'success',
      title: p.customerNameSnapshot,
      subtitle: `Payment received: ${formatKobo(p.amountKobo)}`,
      at: p.createdAt,
      href: p.customerId ? `/customers/${p.customerId}` : '/payments',
    })),
    ...recentInvoices.map((i): ActivityRow => {
      const overdue =
        i.dueDate !== null && new Date(i.dueDate).getTime() < Date.now();
      return {
        key: `inv-${i.id}`,
        Icon: FileText,
        tone: overdue ? 'rose' : 'brand',
        title: i.customerName,
        subtitle: overdue
          ? `Payment overdue · ${i.invoiceNumber}`
          : `Invoice ${i.invoiceNumber} sent`,
        at: i.createdAt,
        href: `/invoices/${i.id}`,
      };
    }),
    ...recentCustomers.map((c): ActivityRow => ({
      key: `cust-${c.id}`,
      Icon: ShoppingBag,
      tone: 'brand',
      title: c.name,
      subtitle: 'New customer added',
      at: c.createdAt,
      href: `/customers/${c.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <TopCustomersCard rows={topByPayment} />
      <RecentActivityCard rows={activity} />
      <QuickActionsCard />
    </div>
  );
}

type ActivityRow = {
  key: string;
  Icon: LucideIcon;
  tone: 'brand' | 'success' | 'owed' | 'rose' | 'slate';
  title: string;
  subtitle: string;
  at: Date;
  href: string;
};

/* ============== Top Customers (This Week) ============== */

function TopCustomersCard({
  rows,
}: {
  rows: { customerNameSnapshot: string; _sum: { amountKobo: number | null } }[];
}) {
  return (
    <DashboardCard title="Top Customers (This Week)" viewAllHref="/customers">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">No paid customers this week.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="num inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.customerNameSnapshot}
                  </div>
                </div>
              </div>
              <span className="num shrink-0 text-xs font-bold text-ink">
                {formatKobo(r._sum.amountKobo ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Recent Customer Activity ============== */

function RecentActivityCard({ rows }: { rows: ActivityRow[] }) {
  const TONE_BG: Record<string, string> = {
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    owed: 'bg-owed-50 text-owed-700',
    brand: 'bg-brand-50 text-brand-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <DashboardCard title="Recent Customer Activity" viewAllHref="/customers">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">No recent activity.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-2">
              <Link
                href={r.href}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE_BG[r.tone]}`}
                >
                  <r.Icon size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.title}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {r.subtitle}
                  </div>
                </div>
              </Link>
              <span className="shrink-0 text-[10px] text-slate-500">
                {timeAgo(r.at)}
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
    // Customers are auto-upserted from transactions, so the entrypoint
    // is "record payment" rather than a standalone customer form (which
    // doesn't exist). Earlier this linked to `/customers/new` which 404'd.
    { Icon: Plus, label: 'Record payment', href: '/payments/new', tone: 'brand' },
    { Icon: BarChart3, label: 'Customer Ledger', href: '/reports', tone: 'success' },
    { Icon: Send, label: 'Sales Report', href: '/reports', tone: 'owed' },
    { Icon: Download, label: 'Export Customers', href: '/api/export/customers', tone: 'rose' },
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
