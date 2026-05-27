import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { TransportMovementsTable, type TransportRow } from '@/components/inventory/TransportMovementsTable';
import { TransportMovementsPageHeader } from '@/components/inventory/TransportMovementsPageHeader';

export const dynamic = 'force-dynamic';

export default async function InventoryTransfersPage() {
  const user = await guard();

  const movements = await prisma.stockMovement.findMany({
    where: { userId: user.id, reason: 'TRANSFER' },
    orderBy: { createdAt: 'desc' },
    take: 200,
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
      ? prisma.rawMaterial.findMany({ where: { id: { in: materialIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const materialName = new Map(materials.map((m) => [m.id, m.name]));

  const rows: TransportRow[] = movements.map((m) => {
    const isProduct = m.itemType === 'PRODUCT';
    const itemName = isProduct
      ? (productName.get(m.itemId) ?? m.itemId)
      : (materialName.get(m.itemId) ?? m.itemId);

    return {
      id: m.id,
      transferNumber: `TRF-${m.id.slice(-6).toUpperCase()}`,
      date: m.createdAt.toISOString(),
      itemName,
      itemHref: isProduct ? `/products/${m.itemId}` : `/materials/${m.itemId}`,
      fromLocation: 'Default Warehouse',
      toLocation: m.refId ?? '—',
      status: 'Not received',
      createdByName: user.name ?? 'User',
      notes: m.notes,
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
          <TransportMovementsPageHeader rowCount={rows.length} />

          <TransportMovementsTable rows={rows} tab="movements" />
        </div>
      </div>
    </AppShell>
  );
}
