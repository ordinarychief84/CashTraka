import Link from 'next/link';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function InventoryAdjustmentsPage() {
  const user = await guard();

  // Show ADJUSTMENT type stock movements
  const movements = await prisma.stockMovement.findMany({
    where: {
      userId: user.id,
      reason: 'ADJUSTMENT',
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Inventory Adjustments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manual corrections to stock — damaged goods, write-offs, recount corrections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/movements" className="btn-pill-ghost">
            <ArrowUpDown size={14} />
            All movements
          </Link>
          <Link href="/materials" className="btn-pill-primary">
            <SlidersHorizontal size={14} />
            Adjust via Materials
          </Link>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        To adjust stock for a specific material, go to{' '}
        <Link href="/materials" className="font-semibold underline hover:text-amber-900">
          Raw Materials
        </Link>{' '}
        and click the adjust button next to the item.
      </div>

      {movements.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No adjustments recorded"
          description="Adjustments appear here when stock is manually corrected. Go to Raw Materials to adjust a specific item."
          actionHref="/materials"
          actionLabel="Go to Raw Materials"
        />
      ) : (
        <div className="card divide-y divide-border">
          {movements.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span
                className={
                  m.delta >= 0
                    ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-700 text-xs'
                    : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 font-bold text-rose-700 text-xs'
                }
              >
                {m.delta >= 0 ? '+' : ''}
                {m.delta}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {m.itemType === 'MATERIAL' ? 'Material' : 'Product'} adjustment
                </p>
                {m.notes && (
                  <p className="truncate text-xs text-slate-500">{m.notes}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">{timeAgo(m.createdAt)}</p>
                <p className="text-[10px] text-slate-400">Balance after: {m.balanceAfter}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
