import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from './DashboardCard';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Recent Production — 5 most-recent ProductionOrder rows.
 */
export async function RecentProductionCard({ userId }: { userId: string }) {
  const runs = await prisma.productionOrder.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      items: {
        select: {
          quantity: true,
          product: { select: { name: true } },
        },
        take: 1,
      },
    },
  });

  return (
    <DashboardCard title="Recent Production" viewAllHref="/production">
      {runs.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">No production runs yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {runs.map((r) => {
            const it = r.items[0];
            const summary = it
              ? `${it.product?.name ?? 'Product'} ${it.quantity} pcs`
              : `${r.items.length} item${r.items.length === 1 ? '' : 's'}`;
            return (
              <li key={r.id}>
                <Link
                  href={`/production/${r.id}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] font-semibold text-slate-700">
                      {r.productionNumber}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {summary}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
