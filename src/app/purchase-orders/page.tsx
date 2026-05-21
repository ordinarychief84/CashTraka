import Link from 'next/link';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { PurchasesHeroKpis } from '@/components/purchases/PurchasesHeroKpis';
import { PurchasesChartRow } from '@/components/purchases/PurchasesChartRow';
import { PurchasesTable, type PurchaseRow } from '@/components/purchases/PurchasesTable';
import { PurchasesRightRail } from '@/components/purchases/PurchasesRightRail';

export const dynamic = 'force-dynamic';

type SP = { status?: string };

export default async function PurchaseOrdersPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const user = await guard();
  const status = (searchParams.status?.split(',') as any) ?? undefined;
  const { rows: orders } = await purchaseOrdersService.listForUser(user.id, {
    status,
    take: 200,
  });

  const tableRows: PurchaseRow[] = orders.map((o) => ({
    id: o.id,
    poNumber: o.poNumber,
    supplierName: o.supplier?.name ?? 'Supplier',
    status: o.status,
    lineCount: o.items.length,
    totalKobo: o.totalKobo,
    amountPaidKobo: o.amountPaidKobo,
    expectedAt: o.expectedAt ? o.expectedAt.toISOString() : null,
    receivedAt: o.receivedAt ? o.receivedAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
  }));

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
            Purchases
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track every PO from draft to received — and what you still owe.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/purchase-orders" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Reports
          </Link>
          <Link href="/purchase-orders/new" className="btn-pill-primary">
            <Plus size={14} />
            New Purchase Order
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <PurchasesHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <PurchasesChartRow userId={user.id} />

      {/* 2-col: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <PurchasesTable rows={tableRows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <PurchasesRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
