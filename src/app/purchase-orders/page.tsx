import Link from 'next/link';
import { List, Plus, Settings2 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { PurchasesTable, type PurchaseRow } from '@/components/purchases/PurchasesTable';

export const dynamic = 'force-dynamic';

type SP = { status?: string };

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const user = await guard();
  const status = (searchParams.status?.split(',') as any) ?? undefined;
  const { rows: orders } = await purchaseOrdersService.listForUser(user.id, {
    status,
    take: 200,
  });

  const tableRows: PurchaseRow[] = orders.map((o) => {
    const deliveredCount = o.items.reduce(
      (sum, it) => sum + (it.quantityReceived ?? 0),
      0,
    );
    const totalQtyCount = o.items.reduce((sum, it) => sum + it.quantity, 0);

    return {
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
      updatedAt: o.updatedAt.toISOString(),
      deliveredCount,
      totalQtyCount,
      createdByName: user.name ?? 'User',
      notes: o.notes ?? null,
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
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">
            Orders from suppliers
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Track every purchase order from draft to received.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white">
            <List size={12} /> LIST VIEW
          </button>
          <Link
            href="/purchase-orders/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition"
          >
            <Plus size={12} /> ADD
          </Link>
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            <Settings2 size={12} /> ADJUST
          </Link>
        </div>
      </div>

      <PurchasesTable rows={tableRows} />
    </AppShell>
  );
}
