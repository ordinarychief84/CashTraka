import Link from 'next/link';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ReceiptsHeroKpis } from '@/components/receipts/ReceiptsHeroKpis';
import { ReceiptsChartRow } from '@/components/receipts/ReceiptsChartRow';
import { ReceiptsTable, type ReceiptRow } from '@/components/receipts/ReceiptsTable';
import { ReceiptsRightRail } from '@/components/receipts/ReceiptsRightRail';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export default async function ReceiptsPage() {
  const user = await guard();

  const receipts = await prisma.receipt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const paymentIds = receipts.map((r) => r.paymentId).filter(Boolean) as string[];
  const debtIds = receipts.map((r) => r.debtId).filter(Boolean) as string[];
  const [payments, debts] = await Promise.all([
    paymentIds.length
      ? prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          select: {
            id: true,
            amountKobo: true,
            customerNameSnapshot: true,
            phoneSnapshot: true,
          },
        })
      : Promise.resolve([]),
    debtIds.length
      ? prisma.debt.findMany({
          where: { id: { in: debtIds } },
          select: {
            id: true,
            amountOwedKobo: true,
            amountPaidKobo: true,
            customerNameSnapshot: true,
            phoneSnapshot: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const paymentMap = new Map(payments.map((p) => [p.id, p]));
  const debtMap = new Map(debts.map((d) => [d.id, d]));

  const rows: ReceiptRow[] = receipts.map((r) => {
    const p = r.paymentId ? paymentMap.get(r.paymentId) : null;
    const d = r.debtId ? debtMap.get(r.debtId) : null;
    const customerName =
      p?.customerNameSnapshot ?? d?.customerNameSnapshot ?? 'Customer';
    const phoneRaw = p?.phoneSnapshot ?? d?.phoneSnapshot ?? '';
    const amount =
      p?.amountKobo ?? d?.amountPaidKobo ?? d?.amountOwedKobo ?? 0;
    return {
      id: r.id,
      receiptNumber: r.receiptNumber,
      customerName,
      phone: phoneRaw ? displayPhone(phoneRaw) : '',
      source: r.source,
      amountKobo: amount,
      balanceRemainingKobo: r.balanceRemainingKobo,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Receipts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every receipt issued — generated, shared and downloadable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/receipts" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Reports
          </Link>
          <Link href="/receipts/new" className="btn-pill-primary">
            <Plus size={14} />
            New Receipt
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <ReceiptsHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <ReceiptsChartRow userId={user.id} />

      {/* 2-col: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ReceiptsTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <ReceiptsRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
