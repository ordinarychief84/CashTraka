import Link from 'next/link';
import { Plus, Package, AlertTriangle, ExternalLink } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProductRowActions } from '@/components/ProductRowActions';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const user = await guardForBusinessType('products');
  const products = await prisma.product.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { name: 'asc' },
  });

  const lowStock = products.filter(
    (p) => p.trackStock && p.stock <= p.lowStockAt,
  );

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Products"
        subtitle="Track what you sell and what's left in stock. Attach items to payments to auto-decrement inventory."
        action={
          <Link href="/products/new" className="btn-primary">
            <Plus size={18} />
            Add
          </Link>
        }
      />

      {lowStock.length > 0 && (
        <div className="mb-4 rounded-xl border border-owed-500/40 bg-owed-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-owed-600" />
            <span className="text-sm font-bold text-owed-700">
              {lowStock.length} {lowStock.length === 1 ? 'product is' : 'products are'} low on stock
            </span>
          </div>
          <ul className="mt-2 text-sm text-owed-700/90">
            {lowStock.slice(0, 5).map((p) => (
              <li key={p.id}>
                • {p.name} — <span className="num">{p.stock} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add items you sell so you can track stock, attach them to payments, and see real profit in your reports."
          actionHref="/products/new"
          actionLabel="Add your first product"
        />
      ) : (
        <ul className="space-y-2">
          {products.map((p) => {
            const isLow = p.trackStock && p.stock <= p.lowStockAt;
            const margin = p.cost != null ? p.price - p.cost : null;
            return (
              <li key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{p.name}</div>
                    {p.note && (
                      <div className="mt-0.5 truncate text-xs text-slate-500">{p.note}</div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="num rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                        {formatNaira(p.price)}
                      </span>
                      {margin !== null && (
                        <span
                          className={cn(
                            'num rounded-full px-2 py-0.5',
                            margin > 0
                              ? 'bg-success-50 text-success-700'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          Margin {formatNaira(margin)}
                        </span>
                      )}
                      {p.trackStock && (
                        <span
                          className={cn(
                            'num rounded-full px-2 py-0.5',
                            isLow
                              ? 'bg-owed-50 text-owed-700'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {p.stock} in stock
                        </span>
                      )}
                    </div>
                  </div>
                  <ProductRowActions id={p.id} trackStock={p.trackStock} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
