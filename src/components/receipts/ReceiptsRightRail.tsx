import Link from 'next/link';
import {
  Clock,
  Receipt as ReceiptIcon,
  Plus,
  Send,
  Download,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';

/**
 * Receipts page right rail:
 *   1. Pending Receipts — top 5 receipts with outstanding balance
 *   2. Recent Receipts  — last 5 by createdAt
 *   3. Quick Actions    — 4 icon tiles
 */
export async function ReceiptsRightRail({ userId }: { userId: string }) {
  const [pending, recent] = await Promise.all([
    prisma.receipt.findMany({
      where: { userId, balanceRemainingKobo: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        receiptNumber: true,
        balanceRemainingKobo: true,
        paymentId: true,
        debtId: true,
        createdAt: true,
      },
    }),
    prisma.receipt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        receiptNumber: true,
        source: true,
        paymentId: true,
        debtId: true,
        createdAt: true,
      },
    }),
  ]);

  const allPaymentIds = [
    ...pending.map((r) => r.paymentId),
    ...recent.map((r) => r.paymentId),
  ].filter(Boolean) as string[];
  const allDebtIds = [
    ...pending.map((r) => r.debtId),
    ...recent.map((r) => r.debtId),
  ].filter(Boolean) as string[];

  const [payments, debts] = await Promise.all([
    allPaymentIds.length
      ? prisma.payment.findMany({
          where: { id: { in: allPaymentIds } },
          select: { id: true, customerNameSnapshot: true, amountKobo: true },
        })
      : Promise.resolve([]),
    allDebtIds.length
      ? prisma.debt.findMany({
          where: { id: { in: allDebtIds } },
          select: {
            id: true,
            customerNameSnapshot: true,
            amountPaidKobo: true,
            amountOwedKobo: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const paymentMap = new Map(payments.map((p) => [p.id, p]));
  const debtMap = new Map(debts.map((d) => [d.id, d]));

  const pendingRows = pending.map((r) => {
    const p = r.paymentId ? paymentMap.get(r.paymentId) : null;
    const d = r.debtId ? debtMap.get(r.debtId) : null;
    return {
      id: r.id,
      receiptNumber: r.receiptNumber,
      customerName: p?.customerNameSnapshot ?? d?.customerNameSnapshot ?? 'Customer',
      balanceKobo: r.balanceRemainingKobo ?? 0,
    };
  });
  const recentRows = recent.map((r) => {
    const p = r.paymentId ? paymentMap.get(r.paymentId) : null;
    const d = r.debtId ? debtMap.get(r.debtId) : null;
    return {
      id: r.id,
      receiptNumber: r.receiptNumber,
      source: r.source,
      customerName: p?.customerNameSnapshot ?? d?.customerNameSnapshot ?? 'Customer',
      amountKobo: p?.amountKobo ?? d?.amountPaidKobo ?? d?.amountOwedKobo ?? 0,
      createdAt: r.createdAt,
    };
  });

  return (
    <div className="space-y-4">
      <PendingReceiptsCard rows={pendingRows} />
      <RecentReceiptsCard rows={recentRows} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Pending Receipts ============== */

function PendingReceiptsCard({
  rows,
}: {
  rows: { id: string; receiptNumber: string; customerName: string; balanceKobo: number }[];
}) {
  return (
    <DashboardCard title="Pending Receipts" viewAllHref="/receipts">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">No partial payments outstanding.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/receipts/${r.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-owed-50 text-owed-700">
                  <Clock size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-bold text-ink">
                    {r.receiptNumber}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {r.customerName}
                  </div>
                </div>
              </Link>
              <span className="num shrink-0 rounded-full bg-owed-100 px-2 py-0.5 text-[10px] font-bold text-owed-800">
                {formatKobo(r.balanceKobo)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Recent Receipts ============== */

function RecentReceiptsCard({
  rows,
}: {
  rows: {
    id: string;
    receiptNumber: string;
    customerName: string;
    source: string;
    amountKobo: number;
    createdAt: Date;
  }[];
}) {
  return (
    <DashboardCard title="Recent Receipts" viewAllHref="/receipts">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">
          Receipts auto-generate when you confirm a payment.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/receipts/${r.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700">
                  <ReceiptIcon size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-bold text-ink">
                    {r.receiptNumber}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {r.customerName} ·{' '}
                    {new Date(r.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
              </Link>
              <span className="num shrink-0 text-xs font-bold text-ink">
                {formatKobo(r.amountKobo)}
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
    { Icon: Plus, label: 'New Receipt', href: '/receipts/new', tone: 'brand' },
    { Icon: Send, label: 'Share Receipt', href: '/receipts', tone: 'success' },
    { Icon: Download, label: 'Export Receipts', href: '/receipts', tone: 'owed' },
    { Icon: ClipboardList, label: 'View History', href: '/payments', tone: 'rose' },
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
