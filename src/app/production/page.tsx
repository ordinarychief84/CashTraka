import Link from 'next/link';
import { AlertTriangle, Factory } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { formatDate, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_COLOURS: Record<string, string> = {
  PLANNED: 'bg-slate-100 text-slate-700',
  MATERIALS_NEEDED: 'bg-amber-100 text-amber-800',
  IN_PRODUCTION: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  DELAYED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

type SP = { status?: string };

export default async function ProductionPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const status = (searchParams.status?.split(',') as any) ?? undefined;
  const { rows: orders, total } = await productionOrdersService.listForUser(user.id, {
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
        title="Production orders"
        subtitle={`${total} order${total === 1 ? '' : 's'}`}
        action={
          <Link href="/production/schedule" className="btn-secondary inline-flex items-center gap-2 text-sm">
            Schedule view
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION', 'COMPLETED'].map((s) => (
          <Link
            key={s}
            href={`/production?status=${s}`}
            className={`rounded-full px-3 py-1 ${STATUS_COLOURS[s]} ${searchParams.status === s ? 'ring-2 ring-offset-1 ring-brand-400' : ''}`}
          >
            {s.replace('_', ' ')}
          </Link>
        ))}
        <Link href="/production" className="rounded-full px-3 py-1 text-slate-500 hover:underline">
          All
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No production runs yet"
          description="Production orders are usually spawned from a customer order. Confirm an order to plan production automatically."
          actionHref="/orders"
          actionLabel="Go to orders"
        />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/production/${o.id}`} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{o.productionNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOURS[o.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                    {o.status === 'MATERIALS_NEEDED' && <AlertTriangle size={14} className="text-amber-600" />}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {o.items.map((it) => `${it.quantity} × ${it.product.name}`).join(', ')}
                  </p>
                  {o.customerOrder && (
                    <p className="text-xs text-slate-400">From {o.customerOrder.orderNumber} ({o.customerOrder.customerName})</p>
                  )}
                </div>
                <div className="text-right">
                  {o.plannedEndAt && <p className="text-xs text-slate-500">due {formatDate(o.plannedEndAt)}</p>}
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
