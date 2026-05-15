import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StarterPackPicker } from '@/components/onboarding/StarterPackPicker';

export const dynamic = 'force-dynamic';

/**
 * Dedicated picker page. Renders all available vertical packs so a
 * brand-new tenant (or one returning after applying skincare and
 * wanting to add packaging) can browse every option in one place.
 *
 * (Note: the first-time auto-redirect from /dashboard was removed
 * after a production outage. The stamp column was rolled back. The
 * picker is reachable from the empty states on /products + /materials
 * and from this URL directly. Re-introduce the auto-redirect once the
 * schema rollout has been proven on a clean deploy.)
 */
export default async function StarterPackPickerPage() {
  const user = await guard();

  const [productCount, materialCount, recipeCount] = await Promise.all([
    prisma.product.count({ where: { userId: user.id, archived: false } }),
    prisma.rawMaterial.count({ where: { userId: user.id, deletedAt: null } }),
    prisma.recipe.count({ where: { userId: user.id, deletedAt: null } }),
  ]);

  const hasAnyData = productCount > 0 || materialCount > 0 || recipeCount > 0;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Starter packs"
        subtitle="Pre-baked products, materials, and recipes for your sector. Pick one — re-running later only adds what you don't already have."
        backHref="/dashboard"
      />

      {hasAnyData && (
        <div className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-xs">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-brand-800">
              You already have data in this workspace
            </div>
            <p className="mt-0.5 text-xs text-brand-700/80">
              {productCount} product{productCount === 1 ? '' : 's'} · {materialCount} material{materialCount === 1 ? '' : 's'} · {recipeCount} recipe{recipeCount === 1 ? '' : 's'}.
              Applying a pack is safe — your existing rows stay untouched, only missing pieces get added.
            </p>
          </div>
          <Link
            href="/products"
            className="shrink-0 self-center text-xs font-bold uppercase tracking-wide text-brand-700 hover:underline"
          >
            Back to products
          </Link>
        </div>
      )}

      <StarterPackPicker />

      <p className="mt-6 text-center text-[11px] text-slate-500">
        Don&apos;t see your sector?{' '}
        <Link href="/products/new" className="font-semibold text-brand-700 hover:underline">
          Add products manually
        </Link>
        {' · '}
        We&apos;re adding more packs based on what new signups ask for.
      </p>
    </AppShell>
  );
}
