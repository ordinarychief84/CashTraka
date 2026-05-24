import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { inventoryService } from '@/lib/services/inventory.service';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function InventoryReceiptsPage() {
  const user = await guard();
  const { rows, total } = await inventoryService.listMovements(user.id, {
    reason: 'PURCHASE_RECEIVE',
    take: 200,
  });

  // Lookup names for items in this page.
  const productIds = Array.from(new Set(rows.filter((r) => r.itemType === 'PRODUCT').map((r) => r.itemId)));
  const materialIds = Array.from(new Set(rows.filter((r) => r.itemType === 'MATERIAL').map((r) => r.itemId)));
  const [products, materials] = await Promise.all([
    productIds.length > 0
      ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [],
    materialIds.length > 0
      ? prisma.rawMaterial.findMany({ where: { id: { in: materialIds } }, select: { id: true, name: true, unit: true } })
      : [],
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Inventory Receipts"
        subtitle="Stock received from supplier purchase orders"
        backHref="/inventory"
      />

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <span>
          Receipts are created automatically when you mark a Purchase Order as received.{' '}
          <Link href="/purchase-orders" className="font-semibold underline hover:text-yellow-900">
            Go to Purchase Orders
          </Link>
          .
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">No receipts yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Supplier PO</th>
                <th className="px-4 py-2 text-right">Delta</th>
                <th className="px-4 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => {
                const name =
                  r.itemType === 'PRODUCT'
                    ? productName.get(r.itemId) ?? r.itemId
                    : materialMap.get(r.itemId)?.name ?? r.itemId;
                const unit = r.itemType === 'MATERIAL' ? materialMap.get(r.itemId)?.unit ?? '' : '';
                const notes = r.notes
                  ? r.notes.length > 40
                    ? r.notes.slice(0, 40) + '…'
                    : r.notes
                  : '—';
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-xs text-slate-500">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={r.itemType === 'PRODUCT' ? `/products/${r.itemId}` : `/materials/${r.itemId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {name}
                      </Link>
                      <span className="ml-2 text-xs text-slate-400">{r.itemType.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{notes}</td>
                    <td className={`px-4 py-2 text-right font-mono font-bold ${r.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {r.delta > 0 ? '+' : ''}
                      {r.delta} {unit}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                      {r.balanceAfter} {unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
