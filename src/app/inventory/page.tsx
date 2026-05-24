import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { prisma } from '@/lib/prisma';
import {
  InventoryTable,
  type InventoryRow,
  type InventoryItemType,
} from '@/components/inventory/InventoryTable';

export const dynamic = 'force-dynamic';

function classifyMaterial(t: string | null): {
  type: InventoryItemType;
  label: string;
} {
  const upper = (t ?? '').toUpperCase();
  if (upper === 'PACKAGING') return { type: 'PACKAGING', label: 'Packaging' };
  if (upper === 'CONSUMABLE') return { type: 'CONSUMABLE', label: 'Consumable' };
  return { type: 'RAW_MATERIAL', label: 'Raw Material' };
}

export default async function InventoryOverviewPage() {
  const user = await guard();

  const [products, materials, activeOrders, pendingPoItems] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, archived: false },
      select: {
        id: true,
        name: true,
        category: true,
        stock: true,
        lowStockAt: true,
        priceKobo: true,
        costKobo: true,
        clientName: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.rawMaterial.findMany({
      where: { userId: user.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        materialType: true,
        unit: true,
        stock: true,
        reorderLevel: true,
        unitCostKobo: true,
        supplier: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    // active production orders → reserved per product
    prisma.productionOrder.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION'] },
      },
      select: {
        items: { select: { productId: true, quantity: true } },
      },
    }),
    // pending / ordered purchase order items → ordered qty per material
    prisma.purchaseOrderItem.findMany({
      where: {
        purchaseOrder: {
          userId: user.id,
          status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        },
      },
      select: { materialId: true, quantity: true, quantityReceived: true },
    }),
  ]);

  // reserved per product (from production orders)
  const reservedByProduct = new Map<string, number>();
  for (const o of activeOrders) {
    for (const it of o.items) {
      reservedByProduct.set(
        it.productId,
        (reservedByProduct.get(it.productId) ?? 0) + it.quantity,
      );
    }
  }

  // ordered (outstanding) per material (total ordered − already received)
  const orderedByMaterial = new Map<string, number>();
  for (const it of pendingPoItems) {
    const outstanding = Math.max(0, it.quantity - it.quantityReceived);
    orderedByMaterial.set(
      it.materialId,
      (orderedByMaterial.get(it.materialId) ?? 0) + outstanding,
    );
  }

  const rows: InventoryRow[] = [
    ...products.map<InventoryRow>((p) => ({
      id: p.id,
      detailHref: `/products/${p.id}`,
      itemType: 'FINISHED_GOOD',
      itemTypeLabel: 'Finished Good',
      name: p.name,
      sku: null,
      unit: 'pcs',
      stock: p.stock,
      reserved: reservedByProduct.get(p.id) ?? 0,
      ordered: 0,
      reorderLevel: p.lowStockAt,
      unitCostKobo: p.costKobo ?? p.priceKobo ?? 0,
      category: p.category,
      supplierName: p.clientName ?? null,
    })),
    ...materials.map<InventoryRow>((m) => {
      const cls = classifyMaterial(m.materialType);
      return {
        id: m.id,
        detailHref: `/materials/${m.id}`,
        itemType: cls.type,
        itemTypeLabel: cls.label,
        name: m.name,
        sku: m.sku,
        unit: m.unit,
        stock: m.stock,
        reserved: 0,
        ordered: orderedByMaterial.get(m.id) ?? 0,
        reorderLevel: m.reorderLevel,
        unitCostKobo: m.unitCostKobo,
        category: m.category,
        supplierName: m.supplier?.name ?? null,
      };
    }),
  ];

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-4">
        <h1 className="text-xl font-black tracking-tight text-ink">
          Inventory
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          One view of every product, raw material, packaging and consumable on your shelves.
        </p>
      </div>

      <InventoryTable rows={rows} />
    </AppShell>
  );
}
