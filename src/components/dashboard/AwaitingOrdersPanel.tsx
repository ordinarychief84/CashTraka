import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';

interface Props {
  userId: string;
}

const ACTIVE_STATUSES = ['NEW', 'CONFIRMED'];

export async function AwaitingOrdersPanel({ userId }: Props) {
  const rows = await prisma.customerOrder
    .findMany({
      where: {
        userId,
        status: { in: ACTIVE_STATUSES },
        deletedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalKobo: true,
        status: true,
        dueAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    .catch(() => []);

  const total = await prisma.customerOrder
    .count({
      where: { userId, status: { in: ACTIVE_STATUSES }, deletedAt: null },
    })
    .catch(() => 0);

  const statusLabel: Record<string, string> = {
    NEW: 'New',
    CONFIRMED: 'Confirmed',
  };

  const statusColor: Record<string, string> = {
    NEW: 'text-blue-600',
    CONFIRMED: 'text-green-600',
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-[13px] font-bold text-ink">
          {total} Awaiting order{total !== 1 ? 's' : ''}
        </h3>
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
          <p className="text-xs text-slate-400">No pending customer orders</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {rows.map((order) => {
            const isOverdue = order.dueAt && new Date(order.dueAt) < new Date();
            return (
              <div key={order.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="block truncate text-[13px] font-medium text-ink hover:text-brand-700"
                  >
                    {order.orderNumber}
                  </Link>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {order.customerName}
                    {isOverdue && (
                      <span className="ml-1.5 text-[10px] font-semibold text-red-500">OVERDUE</span>
                    )}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[12px] font-semibold text-ink">
                    {formatKobo(order.totalKobo ?? 0)}
                  </div>
                  <div className={`text-[11px] font-medium ${statusColor[order.status] ?? 'text-slate-400'}`}>
                    {statusLabel[order.status] ?? order.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-slate-100 px-4 py-2.5">
        <Link
          href="/orders"
          className="text-[12px] font-semibold text-brand-700 hover:underline"
        >
          Show all
        </Link>
      </div>
    </div>
  );
}
