import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';

interface Props {
  userId: string;
}

// POs that are open / in-flight (not yet fully received and not cancelled)
const ACTIVE_STATUSES = ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'];

export async function AwaitingPurchaseOrdersPanel({ userId }: Props) {
  const rows = await prisma.purchaseOrder
    .findMany({
      where: {
        userId,
        status: { in: ACTIVE_STATUSES },
        deletedAt: null,
      },
      select: {
        id: true,
        poNumber: true,
        totalKobo: true,
        status: true,
        expectedAt: true,
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    .catch(() => []);

  const total = await prisma.purchaseOrder
    .count({
      where: { userId, status: { in: ACTIVE_STATUSES }, deletedAt: null },
    })
    .catch(() => 0);

  const statusLabel: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    ORDERED: 'Ordered',
    PARTIALLY_RECEIVED: 'Partial',
  };

  const statusColor: Record<string, string> = {
    DRAFT: 'text-slate-400',
    SENT: 'text-amber-600',
    ORDERED: 'text-blue-600',
    PARTIALLY_RECEIVED: 'text-orange-500',
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-[13px] font-bold text-ink">
          {total} Awaiting purchase order{total !== 1 ? 's' : ''}
        </h3>
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
          <p className="text-xs text-slate-400">No open purchase orders</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {rows.map((po) => (
            <div key={po.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <Link
                  href={`/purchase-orders/${po.id}`}
                  className="block truncate text-[13px] font-medium text-ink hover:text-brand-700"
                >
                  {po.poNumber}
                </Link>
                <span className="text-[11px] text-slate-400 truncate block">
                  {po.supplier?.name ?? 'No supplier'}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[12px] font-semibold text-ink">
                  {formatKobo(po.totalKobo ?? 0)}
                </div>
                <div className={`text-[11px] font-medium ${statusColor[po.status] ?? 'text-slate-400'}`}>
                  {statusLabel[po.status] ?? po.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-slate-100 px-4 py-2.5">
        <Link
          href="/purchase-orders"
          className="text-[12px] font-semibold text-brand-700 hover:underline"
        >
          Show all
        </Link>
      </div>
    </div>
  );
}
