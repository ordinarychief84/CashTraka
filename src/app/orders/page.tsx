import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { customerOrdersService } from '@/lib/services/customer-orders.service';
import { formatKobo, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_COLOURS: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PRODUCTION: 'bg-amber-100 text-amber-700',
  READY: 'bg-emerald-100 text-emerald-700',
  DELIVERED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

type SP = { status?: string };

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const status = (searchParams.status?.split(',') as any) ?? undefined;
  const { rows: orders, total } = await customerOrdersService.listForUser(user.id, {
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
        title="Customer orders"
        subtitle={`${total} order${total === 1 ? '' : 's'}`}
        action={
          <Link href="/orders/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            New order
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED'].map((s) => (
          <Link
            key={s}
            href={`/orders?status=${s}`}
            className={`rounded-full px-3 py-1 ${STATUS_COLOURS[s]} ${searchParams.status === s ? 'ring-2 ring-offset-1 ring-brand-400' : ''}`}
          >
            {s.replace('_', ' ')}
          </Link>
        ))}
        <Link href="/orders" className="rounded-full px-3 py-1 text-slate-500 hover:underline">
          All
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No customer orders yet"
          description="Capture orders before you fulfil them. We'll thread them through production, packaging, and invoicing."
          actionHref="/orders/new"
          actionLabel="Create your first order"
        />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{o.orderNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOURS[o.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {o.customerName}
                    {o.customerPhone ? ` · ${o.customerPhone}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {timeAgo(o.createdAt)}
                    {o.dueAt ? ` · due ${new Date(o.dueAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
                <p className="font-bold text-slate-900">{formatKobo(o.totalKobo)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
