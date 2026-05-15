import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from './DashboardCard';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Recent Orders — 5 most-recent CustomerOrder rows. Each row links to
 * the order detail page.
 */
export async function RecentOrdersCard({ userId }: { userId: string }) {
  const orders = await prisma.customerOrder.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      items: { select: { description: true, quantity: true }, take: 1 },
    },
  });

  return (
    <DashboardCard title="Recent Orders" viewAllHref="/orders">
      {orders.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {orders.map((o) => {
            const item = o.items[0];
            const summary = item
              ? `${item.description} ${item.quantity} pcs`
              : `${o.items.length} item${o.items.length === 1 ? '' : 's'}`;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] font-semibold text-slate-700">
                      {o.orderNumber}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {summary}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
