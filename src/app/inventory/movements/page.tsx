import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { inventoryService } from '@/lib/services/inventory.service';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

type SP = { itemType?: string; reason?: string };

export default async function MovementsPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const user = await guard();
  const { rows, total } = await inventoryService.listMovements(user.id, {
    itemType: (searchParams.itemType as any) || undefined,
    reason: (searchParams.reason as any) || undefined,
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
      <PageHeader title="Inventory ledger" subtitle={`${total} movement${total === 1 ? '' : 's'}`} backHref="/inventory" />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/inventory/movements" className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">All</Link>
        <Link href="/inventory/movements?itemType=MATERIAL" className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Materials</Link>
        <Link href="/inventory/movements?itemType=PRODUCT" className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Products</Link>
      </div>
      {rows.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">No movements yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Reason</th>
                <th className="px-4 py-2 text-right">Δ</th>
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
                    <td className="px-4 py-2 text-slate-700">{r.reason.replace(/_/g, ' ')}</td>
                    <td className={`px-4 py-2 text-right font-mono font-bold ${r.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {r.delta > 0 ? '+' : ''}
                      {r.delta} {unit}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">{r.balanceAfter} {unit}</td>
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
