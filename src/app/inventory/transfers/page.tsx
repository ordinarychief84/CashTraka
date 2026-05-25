import Link from 'next/link';
import { List, Plus } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { TransfersTable, type TransferRow } from '@/components/inventory/TransfersTable';

export const dynamic = 'force-dynamic';

export default async function InventoryTransfersPage() {
  const user = await guard();

  const movements = await prisma.stockMovement.findMany({
    where: { userId: user.id, reason: 'TRANSFER' },
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

  const rows: TransferRow[] = movements.map((m) => {
    const itemName =
      m.itemType === 'PRODUCT'
        ? (productName.get(m.itemId) ?? m.itemId)
        : (materialName.get(m.itemId) ?? m.itemId);
    const itemHref =
      m.itemType === 'PRODUCT' ? `/products/${m.itemId}` : `/materials/${m.itemId}`;

    return {
      id: m.id,
      fromInventory: itemName,
      fromInventoryHref: itemHref,
      toInventory: m.refId ?? '—',
      toInventoryHref: '#',
      transferNumber: `TRF-${m.id.slice(-6).toUpperCase()}`,
      date: m.createdAt.toISOString(),
      identification: m.id.slice(-6).toUpperCase(),
      comments: m.notes,
      createdAt: m.createdAt.toISOString(),
      createdByName: user.name ?? 'User',
      updatedAt: m.createdAt.toISOString(),
      updatedByName: user.name ?? 'User',
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">Inventory transfers</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white">
            <List size={12} /> LIST VIEW
          </button>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-300 px-4 py-2 text-xs font-bold text-white cursor-not-allowed"
            title="Coming soon"
          >
            <Plus size={12} /> ADD
          </button>
        </div>
      </div>

      <TransfersTable rows={rows} />
    </AppShell>
  );
}
