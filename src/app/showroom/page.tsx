import Link from 'next/link';
import {
  ArrowRight,
  Eye,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ShowroomHero } from '@/components/showroom/ShowroomHero';
import { ShowroomTabs } from '@/components/showroom/ShowroomTabs';

export const dynamic = 'force-dynamic';

/**
 * Showroom is the seller's catalog control panel. Mobile-first single-column
 * layout: hero with the public link, smart next-step CTA, then a segmented
 * tab strip for Albums / Products / Activity. Each tab shows its full content
 * inline. There is no separate Products page in the sidebar; product
 * management lives here.
 */
export default async function ShowroomPage() {
  const user = await guard();
  const slug = user.slug ?? null;
  const baseUrl = process.env.APP_URL || '';
  const publicUrl = slug ? `${baseUrl}/store/${slug}` : null;

  const [productCount, publishedCount, albumCount, products, albums, events] =
    await Promise.all([
      prisma.product.count({ where: { userId: user.id, archived: false } }),
      prisma.product.count({
        where: { userId: user.id, archived: false, isPublished: true },
      }),
      prisma.album.count({ where: { userId: user.id, isPublished: true } }),
      prisma.product.findMany({
        where: { userId: user.id, archived: false },
        orderBy: [{ updatedAt: 'desc' }],
        take: 60,
        select: {
          id: true,
          name: true,
          price: true,
          images: true,
          isPublished: true,
          catalogStatus: true,
          trackStock: true,
          stock: true,
          lowStockAt: true,
        },
      }),
      prisma.album.findMany({
        where: { userId: user.id },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: 60,
        include: {
          _count: { select: { products: true } },
          products: {
            take: 1,
            orderBy: { position: 'asc' },
            include: { product: { select: { images: true } } },
          },
        },
      }),
      prisma.catalogEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { product: { select: { name: true } } },
      }),
    ]);

  const catalogReady = !!(user.catalogEnabled && slug);

  // Decide the next-best action for this seller.
  const nextStep = !slug
    ? {
        label: 'Set your storefront link',
        href: '/settings?tab=storefront',
        intent: 'Pick a slug so you have a public link to share.',
      }
    : !user.catalogEnabled
    ? {
        label: 'Publish your storefront',
        href: '/settings?tab=storefront',
        intent: 'Flip catalog on so customers can see it.',
      }
    : productCount === 0
    ? {
        label: 'Add your first product',
        href: '/products/new',
        intent: 'You need at least one product before customers can browse.',
      }
    : albumCount === 0
    ? {
        label: 'Create your first album',
        href: '/showroom/albums/new',
        intent: 'Group products into a shareable, optionally passcoded collection.',
      }
    : null;

  // Shape data for the client tabs.
  const albumCards = albums.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    isPublished: a.isPublished,
    passcodeRequired: a.passcodeRequired,
    coverImageUrl: a.coverImageUrl,
    itemCount: a._count.products,
    firstProductImage: a.products[0]?.product?.images?.[0] ?? null,
  }));

  const eventCards = events.map((e) => ({
    id: e.id,
    type: e.type,
    productName: e.product?.name ?? null,
    customerName: e.customerName,
    createdAtIso: e.createdAt.toISOString(),
  }));

  const recent7d = events.filter(
    (e) => e.createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).length;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Title row */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Showroom</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Build a catalog. Customers browse, ask on WhatsApp, you record the payment, the
            receipt auto-generates.
          </p>
        </div>
        <Link
          href="/settings?tab=storefront"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600"
        >
          <SettingsIcon size={14} />
          Storefront
        </Link>
      </div>

      {/* Hero: link card or setup CTA */}
      <ShowroomHero
        slug={slug}
        publicUrl={publicUrl}
        catalogReady={catalogReady}
        businessName={user.businessName || user.name || 'Showroom'}
      />

      {/* Next-best-action */}
      {nextStep ? (
        <Link
          href={nextStep.href}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-3 transition hover:border-brand-500 hover:bg-brand-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{nextStep.label}</div>
              <div className="text-xs text-slate-600">{nextStep.intent}</div>
            </div>
          </div>
          <ArrowRight size={16} className="shrink-0 text-brand-600" />
        </Link>
      ) : null}

      {/* Compact metrics row */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricChip
          label="Albums"
          value={albumCount}
        />
        <MetricChip
          label="Products"
          value={`${publishedCount}/${productCount}`}
        />
        <MetricChip
          icon={<Eye size={11} />}
          label="7d activity"
          value={recent7d}
        />
      </div>

      {/* Tabbed surface */}
      <div className="mt-6">
        <ShowroomTabs
          storefrontSlug={slug}
          albums={albumCards}
          products={products}
          events={eventCards}
        />
      </div>
    </AppShell>
  );
}

function MetricChip({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold leading-tight text-ink">{value}</div>
    </div>
  );
}
