import Link from 'next/link';
import { Plus, Eye, EyeOff, Edit3, ImageOff } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatNaira } from '@/lib/format';
import { productCatalogStatus } from '@/lib/catalog';
import { ToggleProductPublish } from '@/components/showroom/ToggleProductPublish';

export const dynamic = 'force-dynamic';

export default async function SellProductsPage() {
  const user = await guard();
  const products = await prisma.product.findMany({
    where: { userId: user.id, archived: false },
    orderBy: [{ isPublished: 'desc' }, { updatedAt: 'desc' }],
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
        title="Catalog products"
        subtitle="Choose which products appear on your public storefront."
        action={
          <Link href="/products/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New product
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add a product first, then publish it to your catalog."
          actionHref="/products/new"
          actionLabel="Add product"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const status = productCatalogStatus(p);
            return (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-white">
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 text-xs">
                      <ImageOff size={24} />
                      No images
                    </div>
                  )}
                  {status !== 'AVAILABLE' ? (
                    <div className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {status === 'SOLD_OUT' ? 'Sold out' : 'Low stock'}
                    </div>
                  ) : null}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                      <div className="num text-xs text-brand-600">{formatNaira(p.price)}</div>
                    </div>
                    <Link
                      href={`/products/${p.id}/edit`}
                      title="Edit"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    >
                      <Edit3 size={14} />
                    </Link>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div
                      className={
                        p.isPublished
                          ? 'inline-flex items-center gap-1 text-xs font-semibold text-success-700'
                          : 'inline-flex items-center gap-1 text-xs font-semibold text-slate-500'
                      }
                    >
                      {p.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                      {p.isPublished ? 'Published' : 'Hidden'}
                    </div>
                    <ToggleProductPublish productId={p.id} initial={p.isPublished} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
