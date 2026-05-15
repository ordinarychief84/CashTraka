import Link from 'next/link';
import { Plus, Package, Download, Upload } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StarterPackCta } from '@/components/onboarding/StarterPackCta';
import { listPacks } from '@/lib/vertical-seeds';
import { ProductsTable } from '@/components/products/ProductsTable';
import { ProductsHeroKpis } from '@/components/products/ProductsHeroKpis';
import { ProductsChartRow } from '@/components/products/ProductsChartRow';
import { ProductsRightRail } from '@/components/products/ProductsRightRail';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const user = await guardForBusinessType('products');
  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });

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

      {/* 6 KPI tiles */}
      <ProductsHeroKpis userId={user.id} />

      {/* 3 chart cards: Stock Status · Top Selling · Stock Value by Category */}
      <ProductsChartRow userId={user.id} />

      {/* 2-col layout: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {products.length === 0 ? (
            <div className="space-y-4">
              {/* Vertical starter packs — picker UI lands in PR B; for now we
                  surface the first available pack as a one-tap CTA so brand-new
                  tenants don't stare at an empty grid. */}
              {listPacks().slice(0, 1).map((p) => (
                <StarterPackCta
                  key={p.id}
                  pack={{
                    id: p.id,
                    label: p.label,
                    description: p.description,
                    emoji: p.emoji ?? null,
                    materials: p.materials.length,
                    products: p.products.length,
                    recipes: p.recipes.length,
                  }}
                />
              ))}
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
