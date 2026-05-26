import Link from 'next/link';
import { Plus, Import } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';
import { BOMsTable } from '@/components/recipes/BOMsTable';

export const dynamic = 'force-dynamic';

export default async function RecipesPage() {
  const user = await guard();

  const products = await prisma.product.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { name: 'asc' },
    include: {
      recipe: {
        select: {
          id: true,
          yieldQty: true,
          status: true,
          versionNumber: true,
        },
      },
    },
  });

  // Only show products that have a recipe (or all — user can filter)
  const rows = products.map((p) => ({
    id: p.id,
    number: p.sku ?? '',
    name: p.name,
    group: p.category ?? '',
    salesPrice: p.price ?? 0,
    costPrice: p.cost ?? 0,
    inStock: p.stock ?? 0,
    inOrder: 0,
    available: p.stock ?? 0,
    inProduction: 0,
    hasRecipe: !!p.recipe && p.recipe.status === 'ACTIVE',
    recipeYield: p.recipe?.yieldQty ?? null,
    images: (p.images ?? []) as string[],
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Two-column layout: secondary sidebar + main content */}
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <ItemsSubNav />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Page header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Bills of Materials
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                <Import size={13} />
                Import / Export
              </button>
              <Link
                href="/products/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                <Plus size={13} />
                Create new
              </Link>
            </div>
          </div>

          {/* Table */}
          <BOMsTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
