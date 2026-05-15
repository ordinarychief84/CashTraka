import Link from 'next/link';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { prisma } from '@/lib/prisma';
import { InventoryHeroKpis } from '@/components/inventory/InventoryHeroKpis';
import { InventoryChartRow } from '@/components/inventory/InventoryChartRow';
import {
  InventoryTable,
  type InventoryRow,
  type InventoryItemType,
} from '@/components/inventory/InventoryTable';
import { InventoryRightRail } from '@/components/inventory/InventoryRightRail';

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

  // Load products + materials in parallel. Also load active production orders
  // so we can compute "reserved" stock per product (planned but not produced).
  const [products, materials, activeOrders] = await Promise.all([
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
      },
      orderBy: { name: 'asc' },
    }),
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
  ]);

  // Reserved per product = sum of quantities across active production orders.
  // For materials we don't track per-batch reservations on this page; reserved=0.
  const reservedByProduct = new Map<string, number>();
  for (const o of activeOrders) {
    for (const it of o.items) {
      reservedByProduct.set(
        it.productId,
        (reservedByProduct.get(it.productId) ?? 0) + it.quantity,
      );
    }
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
      reorderLevel: p.lowStockAt,
      unitCostKobo: p.costKobo ?? p.priceKobo ?? 0,
      category: p.category,
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
        reorderLevel: m.reorderLevel,
        unitCostKobo: m.unitCostKobo,
        category: m.category,
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
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            One view of every product, raw material, packaging and consumable
            on your shelves.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/inventory/movements" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Reports
          </Link>
          <Link href="/materials/new" className="btn-pill-primary">
            <Plus size={14} />
            New Item
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <InventoryHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <InventoryChartRow userId={user.id} />

      {/* 2-col layout: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <InventoryTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <InventoryRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
