import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { AdjustmentsTable, type AdjustmentRow } from '@/components/inventory/AdjustmentsTable';

export const dynamic = 'force-dynamic';

export default async function InventoryAdjustmentsPage() {
  const user = await guard();

  const movements = await prisma.stockMovement.findMany({
    where: { userId: user.id, reason: 'ADJUSTMENT' },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // Resolve item names
  const productIds = Array.from(
    new Set(movements.filter((m) => m.itemType === 'PRODUCT').map((m) => m.itemId)),
  );
  const materialIds = Array.from(
    new Set(movements.filter((m) => m.itemType === 'MATERIAL').map((m) => m.itemId)),
  );
  const [products, materials] = await Promise.all([
    productIds.length > 0
      ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [],
    materialIds.length > 0
      ? prisma.rawMaterial.findMany({ where: { id: { in: materialIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const materialName = new Map(materials.map((m) => [m.id, m.name]));

  const rows: AdjustmentRow[] = movements.map((m) => {
    const itemName =
      m.itemType === 'PRODUCT'
        ? (productName.get(m.itemId) ?? m.itemId)
        : (materialName.get(m.itemId) ?? m.itemId);
    const itemHref =
      m.itemType === 'PRODUCT' ? `/products/${m.itemId}` : `/materials/${m.itemId}`;

    return {
      id: m.id,
      adjustNumber: `ADJ-${m.id.slice(-6).toUpperCase()}`,
      date: m.createdAt.toISOString(),
      itemName,
      itemHref,
      reason: m.reason.replace(/_/g, ' '),
      delta: m.delta,
      notes: m.notes,
      createdByName: user.name ?? 'User',
      status: 'Draft',
      category: null,
      location: 'Default Warehouse',
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
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Adjustments
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Import ▾
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create adjustment
              </button>
            </div>
          </div>

          <AdjustmentsTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
