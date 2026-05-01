import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { catalogService, hashClientIp } from '@/lib/services/catalog.service';
import { OrderOnWhatsApp } from '@/components/store/OrderOnWhatsApp';
import { formatNaira } from '@/lib/format';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string; productId: string };
}) {
  const data = await catalogService.getProduct(params.slug, params.productId);
  if (!data) return { title: 'Shop — CashTraka' };
  return {
    title: `${data.product.name} — ${data.business}`,
    description: data.product.description ?? data.product.name,
    openGraph: data.product.images[0]
      ? { images: [{ url: data.product.images[0] }] }
      : undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string; productId: string };
}) {
  const data = await catalogService.getProduct(params.slug, params.productId);
  if (!data) notFound();

  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  catalogService.logView({
    slug: params.slug,
    productId: data.product.id,
    ipHash: hashClientIp(ip),
    referrer: h.get('referer'),
    userAgent: h.get('user-agent'),
  });

  const { product } = data;
  const isSoldOut = product.status === 'SOLD_OUT';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href={`/store/${params.slug}`}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600"
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="ml-auto truncate text-sm font-semibold text-ink">{data.business}</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Images */}
          <div>
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-white ring-1 ring-border">
              {product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                  No image
                </div>
              )}
            </div>
            {product.images.length > 1 ? (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {product.images.slice(1, 8).map((src, i) => (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-lg ring-1 ring-border"
                  >
                    <img src={src} alt={`${product.name} ${i + 2}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-ink">{product.name}</h1>
            <div className="num mt-1 text-2xl font-bold text-brand-600">
              {formatNaira(product.price)}
            </div>
            {product.sku ? (
              <div className="mt-1 text-xs text-slate-500">SKU: {product.sku}</div>
            ) : null}

            {product.status === 'LOW_STOCK' ? (
              <div className="mt-2 inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Only a few left
              </div>
            ) : null}
            {isSoldOut ? (
              <div className="mt-2 inline-flex w-fit rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                Sold out
              </div>
            ) : null}

            {product.description ? (
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                {product.description}
              </p>
            ) : null}

            <div className="mt-5">
              <OrderOnWhatsApp
                slug={params.slug}
                productId={product.id}
                disabled={isSoldOut}
                disabledReason={isSoldOut ? 'Sold out' : undefined}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
