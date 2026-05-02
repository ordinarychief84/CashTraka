import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Lock, Grid3x3 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { catalogService, hashClientIp } from '@/lib/services/catalog.service';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const store = await catalogService.getStore(params.slug);
  if (!store) return { title: 'Shop — CashTraka' };
  return {
    title: `${store.business} — Shop`,
    description: store.tagline ?? `Browse ${store.business} on CashTraka.`,
  };
}

/**
 * Storefront homepage — Yupoo-faithful: a grid of album cards.
 * If the seller has no albums yet, we redirect-style fall through to a
 * minimal CTA pointing customers at the flat product grid at /all.
 */
export default async function StorePage({ params }: { params: { slug: string } }) {
  const store = await catalogService.getStore(params.slug);
  if (!store) notFound();

  // Fire-and-forget VIEW event — don't await on the render path.
  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  catalogService.logView({
    slug: params.slug,
    ipHash: hashClientIp(ip),
    referrer: h.get('referer'),
    userAgent: h.get('user-agent'),
  });

  const hasAlbums = store.albums.length > 0;
  const hasProducts = store.products.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.business}
              className="h-12 w-12 rounded-lg object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-lg font-bold text-brand-600">
              {store.business.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-ink">{store.business}</h1>
            {store.tagline ? (
              <p className="truncate text-xs text-slate-600">{store.tagline}</p>
            ) : null}
          </div>
          {hasAlbums && hasProducts ? (
            <Link
              href={`/store/${params.slug}/all`}
              className="hidden text-xs font-semibold text-brand-600 hover:underline sm:inline-flex sm:items-center sm:gap-1"
            >
              <Grid3x3 size={14} /> All products
            </Link>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!hasAlbums && !hasProducts ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-slate-500">
            No catalog yet. Check back soon.
          </div>
        ) : !hasAlbums ? (
          // Fallback for sellers without albums — show a CTA to view all products.
          <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-border">
            <p className="text-sm text-slate-700">
              {store.products.length} {store.products.length === 1 ? 'product' : 'products'} available.
            </p>
            <Link
              href={`/store/${params.slug}/all`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Grid3x3 size={16} /> Browse all products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {store.albums.map((a) => (
                <Link
                  key={a.slug}
                  href={`/store/${params.slug}/album/${a.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border transition hover:shadow-md"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                    {a.coverImageUrl ? (
                      <img
                        src={a.coverImageUrl}
                        alt={a.title}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        No cover
                      </div>
                    )}
                    {a.passcodeRequired ? (
                      <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                        <Lock size={10} /> Private
                      </div>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-2 text-sm font-semibold text-ink">{a.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {a.itemCount} {a.itemCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {hasProducts ? (
              <div className="mt-6 text-center sm:hidden">
                <Link
                  href={`/store/${params.slug}/all`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                >
                  <Grid3x3 size={14} /> Browse all products
                </Link>
              </div>
            ) : null}
          </>
        )}
      </main>

      <footer className="mx-auto mt-8 flex max-w-5xl items-center justify-center gap-2 px-4 pb-8 text-xs text-slate-500">
        <Logo size="sm" />
        <span>Powered by CashTraka</span>
      </footer>
    </div>
  );
}
