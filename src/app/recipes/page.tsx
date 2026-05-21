import Link from 'next/link';
import { BookOpen, Search } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { recipesService } from '@/lib/services/recipes.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SP = { q?: string };

export default async function RecipesPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
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
      take: 200,
    }),
  ]);

  const withRecipeCount = recipes.length;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Recipes"
        subtitle={`${products.length} product${products.length === 1 ? '' : 's'} · ${withRecipeCount} with a recipe`}
      />

      <form className="mb-4" action="/recipes" method="get">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400"
          />
          <input name="q" defaultValue={q} placeholder="Search products" className="input !pl-11" />
        </div>
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={q ? 'No products match your search' : 'No products in your catalog yet'}
          description={
            q ? undefined : 'Add a finished product first, then attach a recipe to it.'
          }
          actionHref={q ? undefined : '/products/new'}
          actionLabel={q ? undefined : 'Add a product'}
        />
      ) : (
        <ul className="space-y-2">
          {products.map((p) => {
            const recipeStatus = p.recipe?.status ?? null;
            const statusTone =
              recipeStatus === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700'
                : recipeStatus === 'DRAFT'
                  ? 'bg-amber-50 text-amber-700'
                  : recipeStatus === 'ARCHIVED'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-slate-100 text-slate-500';
            return (
              <li key={p.id}>
                <Link
                  href={`/recipes/${p.id}`}
                  className="card flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {p.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {p.recipe
                        ? `${p.recipe.yieldQty} per batch · v${p.recipe.versionNumber}`
                        : 'No recipe yet — tap to add'}
                    </p>
                  </div>
                  <span
                    className={
                      'rounded-full px-2.5 py-1 text-xs font-semibold ' + statusTone
                    }
                  >
                    {p.recipe ? (recipeStatus ?? 'Linked') : 'Missing'}
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
