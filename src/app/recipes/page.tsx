import Link from 'next/link';
import { BookOpen, Search, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { recipesService } from '@/lib/services/recipes.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SP = { q?: string };

export default async function RecipesPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const q = (searchParams.q || '').trim();

  // List all active products so the user can pick one without a recipe yet.
  const [{ rows: recipes }, products] = await Promise.all([
    recipesService.listForUser(user.id, { take: 200 }),
    prisma.product.findMany({
      where: {
        userId: user.id,
        archived: false,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [
        // Products without recipes first — they need attention
        { recipe: { id: 'asc' } },
        { name: 'asc' },
      ],
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
      take: 200,
    }),
  ]);

  const withRecipeCount = products.filter((p) => p.recipe?.status === 'ACTIVE').length;
  const missingCount = products.length - withRecipeCount;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Recipes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            What goes into each product. Recipes power material planning, shortage alerts, and batch cost tracking.
          </p>
        </div>
        {products.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 size={14} />
              <strong>{withRecipeCount}</strong> ready
            </span>
            {missingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-amber-600">
                <AlertTriangle size={14} />
                <strong>{missingCount}</strong> missing
              </span>
            )}
          </div>
        )}
      </div>

      {/* Context banner — shown only when products exist without recipes */}
      {!q && products.length > 0 && missingCount > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            {missingCount} product{missingCount === 1 ? '' : 's'} still need{missingCount === 1 ? 's' : ''} a recipe
          </p>
          <p className="mt-1 text-xs text-amber-700 leading-relaxed">
            Without a recipe, CashTraka can't check if you have enough materials before production starts,
            and can't calculate your batch cost. Click any product below to add its recipe.
          </p>
        </div>
      )}

      <form className="mb-4" action="/recipes" method="get">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400"
          />
          <input name="q" defaultValue={q} placeholder="Search products…" className="input !pl-11" />
        </div>
      </form>

      {products.length === 0 ? (
        q ? (
          <EmptyState icon={BookOpen} title="No products match your search" />
        ) : (
          <div className="space-y-4">
            {/* Why recipes matter — shown first-time */}
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
              <h2 className="mb-2 text-sm font-bold text-brand-800">Why do recipes matter?</h2>
              <ul className="space-y-1.5 text-xs text-brand-700 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-brand-500">→</span>
                  <span>
                    <strong>Material planning:</strong> Before production starts, CashTraka checks
                    if you have enough of every ingredient. No surprises mid-batch.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-brand-500">→</span>
                  <span>
                    <strong>Shortage alerts:</strong> The Materials page and daily notifications
                    tell you what to restock before you run out.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-brand-500">→</span>
                  <span>
                    <strong>Batch cost:</strong> Every production run shows you the real material
                    cost per unit — so you always know your margin.
                  </span>
                </li>
              </ul>
            </div>
            <EmptyState
              icon={Package}
              title="Add your products first"
              description="Recipes are attached to products. Add a finished product, then come back here to list the materials it needs."
              actionHref="/products/new"
              actionLabel="Add a product"
            />
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {products.map((p) => {
            const recipeStatus = p.recipe?.status ?? null;
            const hasActiveRecipe = recipeStatus === 'ACTIVE';
            return (
              <li key={p.id}>
                <Link
                  href={`/recipes/${p.id}`}
                  className="card flex items-center justify-between gap-3 p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${
                        hasActiveRecipe ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}
                    >
                      {hasActiveRecipe ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {p.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {p.recipe
                          ? `Yield: ${p.recipe.yieldQty} per batch · v${p.recipe.versionNumber}`
                          : 'No recipe yet — tap to set up materials'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      hasActiveRecipe
                        ? 'bg-emerald-100 text-emerald-700'
                        : recipeStatus === 'DRAFT'
                          ? 'bg-amber-100 text-amber-700'
                          : recipeStatus === 'ARCHIVED'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {hasActiveRecipe ? 'Active' : p.recipe ? (recipeStatus ?? 'Draft') : 'Missing'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
