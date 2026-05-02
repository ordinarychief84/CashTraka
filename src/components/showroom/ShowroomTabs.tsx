'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Library,
  Package,
  Activity,
  Plus,
  Lock,
  ImageOff,
  Eye,
  EyeOff,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { ToggleProductPublish } from './ToggleProductPublish';

type Album = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  passcodeRequired: boolean;
  coverImageUrl: string | null;
  itemCount: number;
  firstProductImage: string | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  isPublished: boolean;
  catalogStatus: string;
  trackStock: boolean;
  stock: number;
  lowStockAt: number;
};

type ActivityEvent = {
  id: string;
  type: string;
  productName: string | null;
  customerName: string | null;
  createdAtIso: string;
};

type Props = {
  storefrontSlug: string | null;
  albums: Album[];
  products: Product[];
  events: ActivityEvent[];
};

type Tab = 'albums' | 'products' | 'activity';

const TABS: { id: Tab; label: string; icon: typeof Library }[] = [
  { id: 'albums', label: 'Albums', icon: Library },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'activity', label: 'Activity', icon: Activity },
];

function formatNaira(n: number): string {
  return '₦' + n.toLocaleString('en-NG');
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

/**
 * Showroom tabbed surface. Mobile-first: a horizontally scrollable tab strip
 * sits above the active section. On desktop it stretches to fill width.
 *
 * Three tabs:
 *   1. Albums   list and quick-create entry
 *   2. Products list, publish toggle, edit shortcut
 *   3. Activity recent views and order clicks
 */
export function ShowroomTabs({ storefrontSlug, albums, products, events }: Props) {
  const [tab, setTab] = useState<Tab>('albums');

  return (
    <div className="space-y-4">
      {/* Tab strip */}
      <div className="-mx-1 overflow-x-auto" role="tablist">
        <div className="flex min-w-min gap-1 px-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const counts: Record<Tab, number> = {
              albums: albums.length,
              products: products.length,
              activity: events.length,
            };
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ' +
                  (active
                    ? 'bg-ink text-white shadow-sm'
                    : 'border border-border bg-white text-slate-700 hover:border-brand-500 hover:text-brand-700')
                }
              >
                <Icon size={14} />
                {t.label}
                <span
                  className={
                    'ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ' +
                    (active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')
                  }
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'albums' ? (
        <AlbumsPanel storefrontSlug={storefrontSlug} albums={albums} />
      ) : null}
      {tab === 'products' ? <ProductsPanel products={products} /> : null}
      {tab === 'activity' ? <ActivityPanel events={events} /> : null}
    </div>
  );
}

function PanelHeader({
  title,
  cta,
}: {
  title: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {cta ? (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={12} /> {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

function AlbumsPanel({
  storefrontSlug,
  albums,
}: {
  storefrontSlug: string | null;
  albums: Album[];
}) {
  return (
    <section className="space-y-3" aria-label="Albums">
      <PanelHeader
        title="Your albums"
        cta={{ label: 'New album', href: '/showroom/albums/new' }}
      />

      {albums.length === 0 ? (
        <EmptyState
          icon={<Library size={20} />}
          title="No albums yet"
          message="Group your products into a shareable collection. Send the link on WhatsApp instead of forwarding photos one by one."
          ctaHref="/showroom/albums/new"
          ctaLabel="Create first album"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((a) => {
            const cover = a.coverImageUrl || a.firstProductImage;
            return (
              <li
                key={a.id}
                className="overflow-hidden rounded-xl border border-border bg-white"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                  {cover ? (
                    <img src={cover} alt={a.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <ImageOff size={24} />
                    </div>
                  )}
                  {a.passcodeRequired ? (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur">
                      <Lock size={9} /> Private
                    </span>
                  ) : null}
                  {!a.isPublished ? (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      <EyeOff size={9} /> Hidden
                    </span>
                  ) : null}
                </div>
                <div className="flex items-start justify-between gap-1 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{a.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {a.itemCount} {a.itemCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {storefrontSlug ? (
                      <Link
                        href={`/store/${storefrontSlug}/album/${a.slug}`}
                        target="_blank"
                        title="Open public link"
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    ) : null}
                    <Link
                      href={`/showroom/albums/${a.id}/edit`}
                      title="Edit"
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    >
                      <Edit3 size={12} />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ProductsPanel({ products }: { products: Product[] }) {
  return (
    <section className="space-y-3" aria-label="Products">
      <PanelHeader
        title="Your products"
        cta={{ label: 'New product', href: '/products/new' }}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={20} />}
          title="No products yet"
          message="Add your first product. Upload a few photos, set a price, and we will use it everywhere across the app."
          ctaHref="/products/new"
          ctaLabel="Add product"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-border bg-white">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageOff size={24} />
                  </div>
                )}
                {p.catalogStatus === 'SOLD_OUT' ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Sold out
                  </span>
                ) : p.catalogStatus === 'LOW_STOCK' ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Low stock
                  </span>
                ) : null}
              </div>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                    <div className="num text-xs text-brand-600">{formatNaira(p.price)}</div>
                  </div>
                  <Link
                    href={`/products/${p.id}/edit`}
                    title="Edit"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                  >
                    <Edit3 size={12} />
                  </Link>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={
                      p.isPublished
                        ? 'inline-flex items-center gap-0.5 text-[10px] font-semibold text-success-700'
                        : 'inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500'
                    }
                  >
                    {p.isPublished ? <Eye size={10} /> : <EyeOff size={10} />}
                    {p.isPublished ? 'Published' : 'Hidden'}
                  </span>
                  <ToggleProductPublish productId={p.id} initial={p.isPublished} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityPanel({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="space-y-3" aria-label="Activity">
      <PanelHeader title="Recent activity" />

      {events.length === 0 ? (
        <EmptyState
          icon={<Activity size={20} />}
          title="Quiet for now"
          message="Once customers open your link, you will see views and order clicks here."
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-white">
          {events.map((e, i) => (
            <li
              key={e.id}
              className={
                'flex items-start gap-2.5 px-4 py-3 text-sm ' +
                (i > 0 ? 'border-t border-slate-100' : '')
              }
            >
              <div
                className={
                  e.type === 'WHATSAPP_ORDER'
                    ? 'mt-1 h-2 w-2 shrink-0 rounded-full bg-[#25D366]'
                    : 'mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300'
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-semibold text-ink">
                    {e.type === 'WHATSAPP_ORDER' ? 'Order on WhatsApp' : 'View'}
                  </span>
                  {e.productName ? (
                    <span className="truncate text-slate-700">{e.productName}</span>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-500">
                  {formatRelative(e.createdAtIso)}
                  {e.customerName ? ' · ' + e.customerName : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
      <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="mx-auto mt-1 max-w-xs text-xs text-slate-500">{message}</div>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={12} /> {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
