import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
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
 * On first visit, stamps `User.starterPackOfferedAt` so the dashboard
 * first-time gate doesn't keep redirecting after the user picks (or
 * skips) the picker.
 */
export default async function StarterPackPickerPage() {
  const user = await guard();

  // Stamp the first-time-seen marker so the dashboard gate doesn't loop.
  // Fire-and-forget: the stamp's only consumer is the dashboard redirect,
  // and the user is already on the picker, so we don't need to await it.
  if (!user.starterPackOfferedAt) {
    void prisma.user
      .update({
        where: { id: user.id },
        data: { starterPackOfferedAt: new Date() },
      })
      .catch(() => null);
  }

  const [productCount, materialCount, recipeCount] = await Promise.all([
    prisma.product.count({ where: { userId: user.id, archived: false } }),
    prisma.rawMaterial.count({ where: { userId: user.id, deletedAt: null } }),
    prisma.recipe.count({ where: { userId: user.id, deletedAt: null } }),
  ]);

  const hasAnyData = productCount > 0 || materialCount > 0 || recipeCount > 0;
  const isFirstTime = !user.starterPackOfferedAt;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={isFirstTime ? 'Welcome to CashTraka' : 'Starter packs'}
        subtitle={
          isFirstTime
            ? 'Pick the sector that matches your business — we\'ll seed products, materials, and recipes so the dashboards are useful from day one.'
            : "Pre-baked products, materials, and recipes for your sector. Pick one — re-running later only adds what you don't already have."
        }
        backHref={isFirstTime ? undefined : '/dashboard'}
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

      {/* First-time path: an explicit "Skip" gives the owner an exit without
          ever applying a pack. The starterPackOfferedAt stamp at the top of
          this page ensures the dashboard won't loop them back. */}
      {isFirstTime ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Skip for now — I&apos;ll add products manually
            <ArrowRight size={12} />
          </Link>
          <p className="text-[11px] text-slate-400">
            You can revisit this page anytime from the products / materials empty states.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-center text-[11px] text-slate-500">
          Don&apos;t see your sector?{' '}
          <Link href="/products/new" className="font-semibold text-brand-700 hover:underline">
            Add products manually
          </Link>
          {' · '}
          We&apos;re adding more packs based on what new signups ask for.
        </p>
      )}
    </AppShell>
  );
}
