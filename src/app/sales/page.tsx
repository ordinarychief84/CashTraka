import Link from 'next/link';
import { Plus, ShoppingBag, Eye } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatNaira, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  TRANSFER: 'Transfer',
  POS: 'POS',
  CARD: 'Card',
};

export default async function SalesPage() {
  const user = await guardForBusinessType('sales');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { soldAt: 'desc' },
    take: 200,
  });

  const todaySales = sales.filter((s) => new Date(s.soldAt) >= today);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Sales"
        subtitle="Walk-in sales recorded today and recent history."
        action={
          <Link href="/sales/new" className="btn-primary">
            <Plus size={18} />
            Record Sale
          </Link>
        }
      />

      {/* Today summary */}
      {todaySales.length > 0 && (
        <div className="mb-4 rounded-xl border border-success-500/30 bg-success-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-success-700">Today&apos;s Sales</span>
              <span className="ml-2 text-xs text-success-600">{todaySales.length} {todaySales.length === 1 ? 'sale' : 'sales'}</span>
            </div>
            <span className="num text-lg font-bold text-success-700">{formatNaira(todayTotal)}</span>
          </div>
        </div>
      )}

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No sales recorded yet"
          description="Record your first walk-in sale. Add items, pick payment method, and generate a receipt instantly."
          actionHref="/sales/new"
          actionLabel="Record your first sale"
        />
      ) : (
        <ul className="space-y-2">
          {sales.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{s.saleNumber}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      s.paymentMethod === 'CASH' ? 'bg-success-50 text-success-700' :
                      s.paymentMethod === 'TRANSFER' ? 'bg-brand-50 text-brand-700' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {METHOD_LABEL[s.paymentMethod] || s.paymentMethod}
                    </span>
                  </div>
                  {s.customerName && (
                    <div className="mt-0.5 text-xs text-slate-500">{s.customerName}</div>
                  )}
                  <div className="mt-1 text-xs text-slate-400">
                    {new Date(s.soldAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' · '}{s.items.length} {s.items.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-sm font-bold text-ink">{formatNaira(s.total)}</span>
                  <Link href={`/sales/${s.id}`} className="text-brand-600 hover:text-brand-700">
                    <Eye size={16} />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
