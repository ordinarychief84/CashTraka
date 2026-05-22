import Link from 'next/link';
import { Plus, Package, Download, Upload, BookOpen, AlertTriangle } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StarterPackPicker } from '@/components/onboarding/StarterPackPicker';
import { ProductsTable } from '@/components/products/ProductsTable';
import { ProductsHeroKpis } from '@/components/products/ProductsHeroKpis';
import { ProductsChartRow } from '@/components/products/ProductsChartRow';
import { ProductsRightRail } from '@/components/products/ProductsRightRail';

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
      {/* Page header — matches the approved comp */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Products
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your finished goods, track stock levels, sales performance,
            and production history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/products/export" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </a>
          <button type="button" className="btn-pill-ghost" disabled>
            <Upload size={14} />
            Import
          </button>
          <Link href="/products/new" className="btn-pill-primary">
            <Plus size={14} />
            New Product
          </Link>
        </div>
      </div>

      {/* Recipe readiness banner — shown when products exist but some lack active recipes */}
      {products.length > 0 && recipeCount < products.filter((p) => !p.archived).length && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {recipeCount === 0
                ? `${products.filter((p) => !p.archived).length} product${products.filter((p) => !p.archived).length === 1 ? '' : 's'} without a recipe`
                : `${products.filter((p) => !p.archived).length - recipeCount} of your products still need a recipe`}
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              A recipe tells CashTraka what materials to use per batch. Without one, production planning and material shortage checks won't work for that product.
            </p>
          </div>
          <Link
            href="/recipes"
            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
          >
            <BookOpen size={12} className="mr-1 inline-block" />
            Set up recipes
          </Link>
        </div>
      )}

      {/* 6 KPI tiles */}
      <ProductsHeroKpis userId={user.id} />

      {/* 3 chart cards: Stock Status · Top Selling · Stock Value by Category */}
      <ProductsChartRow userId={user.id} />

      {/* 2-col layout: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {products.length === 0 ? (
            <div className="space-y-4">
              {/* Vertical starter packs — pick one to seed materials, products
                  and recipes in one tap. Renders every registered pack via
                  the central registry so adding a new vertical is a single
                  file change. */}
              <div>
                <h2 className="mb-3 text-base font-bold text-ink">
                  Start with a sector pack
                </h2>
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
                group: null,
              }))}
            />
          )}
        </div>
        <aside className="lg:col-span-1">
          <ProductsRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
