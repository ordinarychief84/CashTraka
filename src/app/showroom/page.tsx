import Link from 'next/link';
import {
  ArrowRight,
  Eye,
  ImagePlus,
  Library,
  Lock,
  MessageCircle,
  Package,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ShowroomHero } from '@/components/showroom/ShowroomHero';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * Showroom — the seller's public-catalog control panel.
 *
 * The page guides the seller through three states with one contextual hero:
 *   1. No storefront slug yet           → "Set up your storefront"
 *   2. Slug set, no products            → "Add your first product"
 *   3. Slug + products, no album        → "Group products into an album"
 *   4. Everything ready                 → big share button + recent activity
 */
export default async function ShowroomPage() {
  const user = await guard();
  const slug = user.slug ?? null;
  const baseUrl = process.env.APP_URL || '';
  const publicUrl = slug ? `${baseUrl}/store/${slug}` : null;

  const [productCount, publishedCount, albumCount, recentEvents] = await Promise.all([
    prisma.product.count({ where: { userId: user.id, archived: false } }),
    prisma.product.count({ where: { userId: user.id, archived: false, isPublished: true } }),
    prisma.album.count({ where: { userId: user.id, isPublished: true } }),
    prisma.catalogEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
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
        intent: 'Group products into a shareable, optionally-passcoded collection.',
      }
    : null;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Title row — minimal */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Showroom</h1>
          <p className="text-sm text-slate-500">
            Build a Yupoo-style catalog. Customers browse, ask on WhatsApp, you record the
            payment — receipt auto-generates.
          </p>
        </div>
        <Link
          href="/settings?tab=storefront"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600"
        >
          <SettingsIcon size={14} />
          Storefront settings
        </Link>
      </div>

      {/* Hero: link card or setup CTA */}
      <ShowroomHero
        slug={slug}
        publicUrl={publicUrl}
        catalogReady={catalogReady}
        businessName={user.businessName || user.name || 'Showroom'}
      />

      {/* Next-best-action card */}
      {nextStep ? (
        <Link
          href={nextStep.href}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-3 transition hover:border-brand-500 hover:bg-brand-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{nextStep.label}</div>
              <div className="text-xs text-slate-600">{nextStep.intent}</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-brand-600" />
        </Link>
      ) : null}

      {/* Metrics — three tight cards */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          icon={<Package size={16} />}
          label="Products"
          value={`${publishedCount}`}
          sub={`of ${productCount} published`}
          href="/products"
        />
        <MetricCard
          icon={<Library size={16} />}
          label="Albums"
          value={`${albumCount}`}
          sub={albumCount === 1 ? 'collection' : 'collections'}
          href="/showroom/albums"
        />
        <MetricCard
          icon={<Eye size={16} />}
          label="Activity (last 7 days)"
          value={String(
            recentEvents.filter(
              (e) => e.createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).length,
          )}
          sub="views + order clicks"
          href="/showroom/events"
        />
      </div>

      {/* Action tiles + Activity */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ActionTile
              icon={<Library size={18} />}
              title="Albums"
              hint="Group products into collections, optionally passcode-protected."
              href="/showroom/albums"
              cta={albumCount === 0 ? 'Create first album' : 'Manage albums'}
            />
            <ActionTile
              icon={<Package size={18} />}
              title="Products"
              hint="Add or edit products, upload images, set pricing."
              href="/showroom/products"
              cta="Manage products"
            />
            <ActionTile
              icon={<MessageCircle size={18} />}
              title="Share"
              hint="Copy your storefront link or share on WhatsApp."
              href="/showroom/share"
              cta="Share link"
            />
            <ActionTile
              icon={<Eye size={18} />}
              title="Preview"
              hint="See exactly what your customers see."
              href="/showroom/preview"
              cta="Open preview"
            />
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recent activity
            </div>
            <Link
              href="/showroom/events"
              className="text-[11px] font-semibold text-brand-600 hover:underline"
            >
              All
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ImagePlus size={18} />
              </div>
              <div className="text-sm font-medium text-slate-700">Quiet for now</div>
              <div className="text-xs text-slate-500">
                Once customers open your link, you&apos;ll see their visits here.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
                  <div
                    className={
                      e.type === 'WHATSAPP_ORDER'
                        ? 'mt-1 h-2 w-2 shrink-0 rounded-full bg-[#25D366]'
                        : 'mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">
                      {e.type === 'WHATSAPP_ORDER' ? 'Order on WhatsApp' : 'View'}
                      {e.product?.name ? ` · ${e.product.name}` : ''}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatDateTime(e.createdAt)}
                      {e.customerName ? ` · ${e.customerName}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock size={11} />
        Albums can be passcode-protected. Customers never see other sellers&apos; data.
      </p>
    </AppShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 transition hover:border-brand-500 hover:bg-brand-50/30"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-brand-500 group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-ink">{value}</span>
          <span className="truncate text-xs text-slate-500">{sub}</span>
        </div>
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-600" />
    </Link>
  );
}

function ActionTile({
  icon,
  title,
  hint,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-white p-4 transition hover:border-brand-500 hover:shadow-sm"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{hint}</div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
        {cta} <ArrowRight size={12} />
      </div>
    </Link>
  );
}
