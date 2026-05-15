import Link from 'next/link';
import { Boxes, Plus, Download, Upload } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StarterPackPicker } from '@/components/onboarding/StarterPackPicker';
import { MaterialsHeroKpis } from '@/components/ops/MaterialsHeroKpis';
import { MaterialsChartRow } from '@/components/ops/MaterialsChartRow';
import { MaterialsRightRail } from '@/components/ops/MaterialsRightRail';
import { MaterialsTable } from '@/components/ops/MaterialsTable';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';
import { AutoPoButton } from '@/components/ops/AutoPoButton';
import { hasFeature } from '@/lib/gate';

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
          <AutoPoButton canUse={hasFeature(user, 'autoPurchaseOrders')} />
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
            q || lowStockOnly ? (
              <EmptyState
                icon={Boxes}
                title={
                  q ? 'No materials match your search' : 'No materials are low'
                }
              />
            ) : (
              <div className="space-y-4">
                {/* Brand-new tenants land here — surface the starter packs
                    inline so they can seed materials, products, AND recipes
                    in one tap instead of adding 13 things by hand. */}
                <div>
                  <h2 className="mb-3 text-base font-bold text-ink">
                    Start with a sector pack
                  </h2>
                  <p className="mb-4 text-xs text-slate-500">
                    Pick the closest match — every pack seeds the materials, products, AND recipes in one tap.
                  </p>
                  <StarterPackPicker />
                </div>

                <EmptyState
                  icon={Boxes}
                  title="Or add materials one by one"
                  description="Skip the starter pack if you'd rather build your inputs from scratch."
                  actionHref="/materials/new"
                  actionLabel="Add a material"
                />
              </div>
            )
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
