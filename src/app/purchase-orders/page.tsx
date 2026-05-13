import Link from 'next/link';
import { Plus, Truck } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { formatKobo, formatDate, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_COLOURS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  ORDERED: 'bg-indigo-100 text-indigo-700',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

type SP = { status?: string };

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const status = (searchParams.status?.split(',') as any) ?? undefined;
  const { rows: orders, total } = await purchaseOrdersService.listForUser(user.id, {
    status,
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
      <PageHeader
        title="Purchase orders"
        subtitle={`${total} order${total === 1 ? '' : 's'}`}
        action={
          <Link href="/purchase-orders/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            New PO
          </Link>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No purchase orders yet"
          description="When you spot material shortages, create a PO to your supplier. We'll track the order and stock-in for you."
          actionHref="/purchase-orders/new"
          actionLabel="Create your first PO"
        />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/purchase-orders/${o.id}`} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{o.poNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOURS[o.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {o.supplier.name} · {o.items.length} line{o.items.length === 1 ? '' : 's'}
                  </p>
                  {o.expectedAt && <p className="text-xs text-slate-400">expected {formatDate(o.expectedAt)}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{formatKobo(o.totalKobo)}</p>
                  <p className="text-xs text-slate-400">{timeAgo(o.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
