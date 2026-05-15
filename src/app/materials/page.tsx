import Link from 'next/link';
import { Boxes, Plus, Download, Upload } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { MaterialsHeroKpis } from '@/components/ops/MaterialsHeroKpis';
import { MaterialsChartRow } from '@/components/ops/MaterialsChartRow';
import { MaterialsRightRail } from '@/components/ops/MaterialsRightRail';
import { MaterialsTable } from '@/components/ops/MaterialsTable';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';

export const dynamic = 'force-dynamic';

type SP = { q?: string; lowStock?: string };

export default async function MaterialsPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const q = (searchParams.q || '').trim();
  const lowStockOnly = searchParams.lowStock === '1';
  const { rows: materials } = await rawMaterialsService.listForUser(user.id, {
    q,
    lowStockOnly,
    take: 200,
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Page header — matches the approved comp */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Materials
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and manage raw materials, stock levels, usage, and supplier
            information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-pill-ghost" disabled>
            <Download size={14} />
            Export
          </button>
          <button type="button" className="btn-pill-ghost" disabled>
            <Upload size={14} />
            Import
          </button>
          <Link href="/materials/new" className="btn-pill-primary">
            <Plus size={14} />
            New Material
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <MaterialsHeroKpis userId={user.id} />

      {/* 3 chart cards: Stock Status · Top Used · Materials by Category */}
      <MaterialsChartRow userId={user.id} />

      {/* 2-col layout: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {materials.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={
                q
                  ? 'No materials match your search'
                  : lowStockOnly
                    ? 'No materials are low'
                    : 'No raw materials yet'
              }
              description={
                q || lowStockOnly
                  ? undefined
                  : 'Add the inputs you use to make your products — flour, fabric, packaging, etc.'
              }
              actionHref={q || lowStockOnly ? undefined : '/materials/new'}
              actionLabel={
                q || lowStockOnly ? undefined : 'Add your first material'
              }
            />
          ) : (
            <MaterialsTable
              rows={materials.map((m: any) => ({
                id: m.id,
                name: m.name,
                sku: m.sku ?? null,
                category: m.category ?? null,
                unit: m.unit,
                stock: m.stock,
                reorderLevel: m.reorderLevel,
                unitCostKobo: m.unitCostKobo,
                status: m.status ?? 'ACTIVE',
                supplierName: m.supplier?.name ?? null,
                lastPurchaseAt: m.supplier?.lastPurchaseAt
                  ? new Date(m.supplier.lastPurchaseAt).toISOString()
                  : null,
              }))}
            />
          )}
        </div>
        <aside className="lg:col-span-1">
          <MaterialsRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
