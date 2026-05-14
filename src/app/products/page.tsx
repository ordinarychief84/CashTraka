import Link from 'next/link';
import { Plus, Package, AlertTriangle, Download } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProductsTable } from '@/components/products/ProductsTable';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const user = await guardForBusinessType('products');
  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });

  const visible = products.filter((p) => !p.archived);
  const lowStock = visible.filter((p) => p.trackStock && p.stock <= p.lowStockAt);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Products"
        subtitle={`${visible.length} active · ${products.length - visible.length} archived`}
        action={
          <div className="flex items-center gap-2">
            <a
              href="/api/products/export"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} />
              Export
            </a>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add product
            </Link>
          </div>
        }
      />

      {lowStock.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600" />
            <span className="text-sm font-bold text-rose-700">
              {lowStock.length}{' '}
              {lowStock.length === 1 ? 'product is' : 'products are'} low on stock
            </span>
          </div>
          <ul className="mt-2 text-sm text-rose-700/90">
            {lowStock.slice(0, 5).map((p) => (
              <li key={p.id}>
                • {p.name}, <span className="num">{p.stock} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add what you sell so you can track stock, attach items to orders, and see real profit in your reports."
          actionHref="/products/new"
          actionLabel="Add your first product"
        />
      ) : (
        <ProductsTable
          rows={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            note: p.note,
            description: p.description,
            price: p.price,
            cost: p.cost,
            stock: p.stock,
            trackStock: p.trackStock,
            lowStockAt: p.lowStockAt,
            archived: p.archived,
            isPublished: p.isPublished,
            catalogStatus: p.catalogStatus,
            nafdacNumber: p.nafdacNumber,
            shelfLifeDays: p.shelfLifeDays,
            images: p.images ?? [],
            // Future-proof: product group concept doesn't exist on the
            // Product schema yet, so we derive a sensible default per row.
            group: null,
          }))}
        />
      )}
    </AppShell>
  );
}
