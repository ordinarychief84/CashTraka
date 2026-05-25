import Link from 'next/link';
import { Boxes, Plus, Upload, Settings2 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StarterPackPicker } from '@/components/onboarding/StarterPackPicker';
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
      {/* Page header — Prodio style */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">Raw Materials</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Track and manage raw materials, stock levels, and supplier information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Upload size={12} /> IMPORTER
            <span className="ml-0.5 rounded bg-brand-500 px-1 py-0.5 text-[9px] font-bold text-white leading-none">
              NEW
            </span>
          </button>
          <AutoPoButton canUse={hasFeature(user, 'autoPurchaseOrders')} />
          <Link
            href="/materials/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition"
          >
            <Plus size={12} /> ADD
          </Link>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            <Settings2 size={12} /> ADJUST
          </Link>
        </div>
      </div>

      {/* Full-width table or empty state */}
      {materials.length === 0 ? (
        q || lowStockOnly ? (
          <EmptyState
            icon={Boxes}
            title={q ? 'No materials match your search' : 'No materials are low'}
          />
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="mb-3 text-base font-bold text-ink">Start with a sector pack</h2>
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
            safetyStock: m.safetyStock ?? null,
            minimumPurchaseQuantity: m.minimumPurchaseQuantity ?? null,
            storageLocation: m.storageLocation ?? null,
            notes: m.notes ?? null,
            materialType: m.materialType ?? null,
            createdAt: m.createdAt?.toISOString() ?? null,
          }))}
        />
      )}
    </AppShell>
  );
}
