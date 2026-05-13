import Link from 'next/link';
import { AlertTriangle, Boxes, Plus, Search } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';
import { MaterialScanLookup } from '@/components/ops/MaterialScanLookup';

export const dynamic = 'force-dynamic';

type SP = { q?: string; lowStock?: string };

export default async function MaterialsPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const q = (searchParams.q || '').trim();
  const lowStockOnly = searchParams.lowStock === '1';
  const { rows: materials, total } = await rawMaterialsService.listForUser(user.id, {
    q,
    lowStockOnly,
    take: 200,
  });

  const lowCount = lowStockOnly
    ? total
    : materials.filter((m) => m.stock <= m.reorderLevel).length;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Raw materials"
        subtitle={`${total} material${total === 1 ? '' : 's'}${lowCount > 0 ? ` · ${lowCount} low` : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MaterialScanLookup />
            <Link href="/materials/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              New material
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <form className="flex-1" action="/materials" method="get">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400"
            />
            <input name="q" defaultValue={q} placeholder="Search materials" className="input !pl-11" />
            {lowStockOnly && <input type="hidden" name="lowStock" value="1" />}
          </div>
        </form>
        <Link
          href={lowStockOnly ? '/materials' : '/materials?lowStock=1'}
          className={
            lowStockOnly
              ? 'btn-primary inline-flex items-center justify-center gap-2'
              : 'btn-secondary inline-flex items-center justify-center gap-2'
          }
        >
          <AlertTriangle size={14} />
          {lowStockOnly ? 'Showing low stock' : 'Show low stock'}
        </Link>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={q ? 'No materials match your search' : lowStockOnly ? 'No materials are low' : 'No raw materials yet'}
          description={
            q || lowStockOnly
              ? undefined
              : 'Add the inputs you use to make your products — flour, fabric, packaging, etc.'
          }
          actionHref={q || lowStockOnly ? undefined : '/materials/new'}
          actionLabel={q || lowStockOnly ? undefined : 'Add your first material'}
        />
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => {
            const low = m.stock <= m.reorderLevel;
            return (
              <li key={m.id}>
                <Link href={`/materials/${m.id}`} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">{m.name}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {m.supplier?.name ? `${m.supplier.name} · ` : ''}
                      {m.sku ? `SKU ${m.sku}` : 'No SKU'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${low ? 'text-rose-600' : 'text-slate-900'}`}>
                      {m.stock} {m.unit}
                    </p>
                    {m.reorderLevel > 0 && (
                      <p className="text-xs text-slate-400">reorder at {m.reorderLevel}</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
