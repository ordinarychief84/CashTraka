import Link from 'next/link';
import { notFound } from 'next/navigation';
import { History } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { RawMaterialForm } from '@/components/ops/RawMaterialForm';
import { AdjustStockButton } from '@/components/ops/AdjustStockButton';
import { LeadTimeAlertsCard } from '@/components/ops/LeadTimeAlertsCard';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';
import { suppliersService } from '@/lib/services/suppliers.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MaterialDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await guard();
  let material;
  try {
    material = await rawMaterialsService.getForUser(user.id, params.id);
  } catch {
    notFound();
  }
  const [{ rows: suppliers }, { rows: movements }] = await Promise.all([
    suppliersService.listForUser(user.id, { take: 200 }),
    inventoryService.movementsForItem(user.id, 'MATERIAL', material.id, { take: 30 }),
  ]);
  const low = material.stock <= material.reorderLevel;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={material.name}
        subtitle={`${material.stock} ${material.unit} on hand${low ? ' · LOW' : ''}`}
        backHref="/materials"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Details</h2>
            <RawMaterialForm
              initial={material}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Quick actions</h2>
            <AdjustStockButton materialId={material.id} />
            <Link href={`/purchase-orders/new?materialId=${material.id}`} className="btn-secondary mt-2 inline-flex w-full justify-center">
              Reorder from supplier
            </Link>
          </div>

          <LeadTimeAlertsCard
            userId={user.id}
            materialId={material.id}
            showAllLink={false}
            limit={10}
          />

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <History size={14} /> Recent movements
            </h2>
            {movements.length === 0 ? (
              <p className="text-sm text-slate-500">No stock changes yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <li key={m.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">{m.reason}</span>
                      <span className={`font-mono font-bold ${m.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.delta > 0 ? '+' : ''}
                        {m.delta}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(m.createdAt)} · balance {m.balanceAfter}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
