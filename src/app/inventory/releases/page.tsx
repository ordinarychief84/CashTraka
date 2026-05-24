import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { inventoryService } from '@/lib/services/inventory.service';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';
import type { StockMovementReason } from '@/lib/services/inventory.service';

export const dynamic = 'force-dynamic';

const RELEASE_REASONS: StockMovementReason[] = [
  'PRODUCTION_CONSUME',
  'PRODUCTION_PRODUCE',
  'SALE',
];

type SP = { reason?: string };

export default async function InventoryReleasesPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();

  const rawReason = searchParams.reason;
  const activeReason = RELEASE_REASONS.includes(rawReason as StockMovementReason)
    ? (rawReason as StockMovementReason)
    : undefined;

  // If a specific release reason is selected use the service; otherwise
  // query prisma directly to filter by the set of release reasons.
  let rows: Awaited<ReturnType<typeof inventoryService.listMovements>>['rows'];
  let total: number;

  if (activeReason) {
    const result = await inventoryService.listMovements(user.id, {
      reason: activeReason,
      take: 200,
    });
    rows = result.rows;
    total = result.total;
  } else {
    const where = { userId: user.id, reason: { in: RELEASE_REASONS } };
    const take = 200;
    [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.stockMovement.count({ where }),
    ]);
  }

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

  const tabs: { label: string; href: string; reason?: StockMovementReason }[] = [
    { label: 'All', href: '/inventory/releases' },
    { label: 'Production consumed', href: '/inventory/releases?reason=PRODUCTION_CONSUME', reason: 'PRODUCTION_CONSUME' },
    { label: 'Production output', href: '/inventory/releases?reason=PRODUCTION_PRODUCE', reason: 'PRODUCTION_PRODUCE' },
    { label: 'Sales', href: '/inventory/releases?reason=SALE', reason: 'SALE' },
  ];

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Inventory Releases"
        subtitle="Stock consumed by production or dispatched via sales"
        backHref="/inventory"
      />

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {tabs.map((tab) => {
          const isActive = tab.reason === activeReason;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-3 py-1 text-sm ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">No releases yet.</p>
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
