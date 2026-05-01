import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { catalogService, hashClientIp } from '@/lib/services/catalog.service';
import { formatNaira } from '@/lib/format';
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
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {store.products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-slate-500">
            No products listed yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {store.products.map((p) => (
              <Link
                key={p.id}
                href={`/store/${params.slug}/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border transition hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
                      No image
                    </div>
                  )}
                  {p.status === 'SOLD_OUT' ? (
                    <div className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Sold out
                    </div>
                  ) : p.status === 'LOW_STOCK' ? (
                    <div className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Low stock
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="line-clamp-2 text-sm font-medium text-ink">{p.name}</div>
                  <div className="num mt-1 text-base font-bold text-brand-600">
                    {formatNaira(p.price)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto mt-8 flex max-w-5xl items-center justify-center gap-2 px-4 pb-8 text-xs text-slate-500">
        <Logo size="sm" />
        <span>Powered by CashTraka</span>
      </footer>
    </div>
  );
}
