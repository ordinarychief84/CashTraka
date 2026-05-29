import Link from 'next/link';
import { BookOpen, AlertTriangle } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StarterPackPicker } from '@/components/onboarding/StarterPackPicker';
import { ProductsTable } from '@/components/products/ProductsTable';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const user = await guardForBusinessType('products');
  const [products, recipeCount] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    }),
    prisma.recipe.count({
      where: { userId: user.id, deletedAt: null, status: 'ACTIVE' },
    }),
  ]);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        {/* Secondary sidebar — Rackbeat Items nav */}
        <ItemsSubNav />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* ── Recipe readiness banner ── */}
          {products.length > 0 && recipeCount < products.filter((p) => !p.archived).length && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-owed-200 bg-owed-50 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-owed-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-owed-800">
                  {recipeCount === 0
                    ? `${products.filter((p) => !p.archived).length} product${products.filter((p) => !p.archived).length === 1 ? '' : 's'} without a recipe`
                    : `${products.filter((p) => !p.archived).length - recipeCount} products still need a recipe`}
                </p>
                <p className="mt-0.5 text-xs text-owed-700">
                  Recipes tell CashTraka what raw materials each product needs. Without one, production planning and shortage alerts won&apos;t work.
                </p>
              </div>
              <Link
                href="/recipes"
                className="shrink-0 rounded-lg bg-owed-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-owed-600"
              >
                <BookOpen size={12} className="mr-1 inline-block" />
                Set up recipes
              </Link>
            </div>
          )}

          {/* ── Full-width product table ── */}
          {products.length === 0 ? (
            <div className="space-y-4">
              <div>
                <h2 className="mb-3 text-base font-bold text-ink">Start with a sector pack</h2>
                <p className="mb-4 text-xs text-slate-500">
                  Pick the closest match. Re-running later only adds missing pieces.
                </p>
                <StarterPackPicker />
              </div>
              <EmptyState
                icon={Package}
                title="Or add products one by one"
                description="Skip the starter pack if your catalogue doesn't match — you can add each product manually."
                actionHref="/products/new"
                actionLabel="Add a product"
              />
            </div>
          ) : (
            <ProductsTable
              rows={products.map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                barcodeValue: p.barcodeValue,
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
                group: p.category,
              }))}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
