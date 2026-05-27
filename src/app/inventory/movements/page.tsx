import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { MovementsTable, type MovementRow } from '@/components/inventory/MovementsTable';

export const dynamic = 'force-dynamic';

export default async function MovementsPage() {
  const user = await guard();

  const movements = await prisma.stockMovement.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

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
      ? prisma.rawMaterial.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, name: true, unit: true },
        })
      : [],
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  const rows: MovementRow[] = movements.map((m) => {
    const isProduct = m.itemType === 'PRODUCT';
    const itemName = isProduct
      ? (productName.get(m.itemId) ?? m.itemId)
      : (materialMap.get(m.itemId)?.name ?? m.itemId);
    const unit = isProduct ? '' : (materialMap.get(m.itemId)?.unit ?? '');

    return {
      id: m.id,
      date: m.createdAt.toISOString(),
      itemName,
      itemHref: isProduct ? `/products/${m.itemId}` : `/materials/${m.itemId}`,
      itemType: m.itemType,
      reason: m.reason,
      delta: m.delta,
      balanceAfter: m.balanceAfter,
      unit,
      createdByName: user.name ?? 'User',
      status: 'Posted',
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
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Movements
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
                + Create new
              </button>
            </div>
          </div>

          <MovementsTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
