import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { cookies, headers } from 'next/headers';
import { catalogService, hashClientIp } from '@/lib/services/catalog.service';
import { albumCookieName, verifyAlbumToken } from '@/lib/album-passcode';
import { AlbumUnlockForm } from '@/components/store/AlbumUnlockForm';
import { formatNaira } from '@/lib/format';
import { SafeImage } from '@/components/SafeImage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string; albumSlug: string };
}) {
  const data = await catalogService.getAlbum(params.slug, params.albumSlug);
  if (!data) return { title: 'Album, CashTraka' };
  return {
    title: `${data.album.title}, ${data.business}`,
    description: data.album.description ?? `${data.album.title} catalog`,
    openGraph: data.album.coverImageUrl
      ? { images: [{ url: data.album.coverImageUrl }] }
      : undefined,
  };
}

export default async function AlbumPage({
  params,
}: {
  params: { slug: string; albumSlug: string };
}) {
  const data = await catalogService.getAlbum(params.slug, params.albumSlug);
  if (!data) notFound();

  // If passcode-protected, gate behind the unlock form unless we have a
  // valid signed cookie for THIS album id.
  let unlocked = !data.album.passcodeRequired;
  if (data.album.passcodeRequired) {
    const cookieJar = cookies();
    const token = cookieJar.get(albumCookieName(data.album.id))?.value;
    unlocked = await verifyAlbumToken(token, data.album.id);
  }

  // Fire-and-forget VIEW event for analytics (only when unlocked, so failed
  // unlock attempts don't pollute the seller's stats).
  if (unlocked) {
    const h = headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    catalogService.logView({
      slug: params.slug,
      ipHash: hashClientIp(ip),
      referrer: h.get('referer'),
      userAgent: h.get('user-agent'),
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href={`/store/${params.slug}`}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600"
          >
            <ArrowLeft size={16} /> Albums
          </Link>
          <div className="ml-auto truncate text-sm font-semibold text-ink">
            {data.business}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Album header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-ink">{data.album.title}</h1>
          {data.album.description ? (
            <p className="mt-1 text-sm text-slate-600">{data.album.description}</p>
          ) : null}
          <div className="mt-2 text-xs text-slate-500">
            {data.products.length} {data.products.length === 1 ? 'item' : 'items'}
          </div>
        </div>

        {!unlocked ? (
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-border">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Lock size={20} />
              </div>
              <h2 className="text-lg font-bold text-ink">This album is private</h2>
              <p className="mt-1 text-sm text-slate-600">
                Enter the passcode the seller shared with you to view the products.
              </p>
              <div className="mt-5">
                <AlbumUnlockForm slug={params.slug} albumSlug={params.albumSlug} />
              </div>
            </div>
          </div>
        ) : data.products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-slate-500">
            This album is empty.
          </div>
        ) : (
          // Yupoo-style image grid: dense, image-first, masonry-like via aspect.
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {data.products.map((p) => (
              <Link
                key={p.id}
                href={`/store/${params.slug}/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-border transition hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                  <SafeImage
                    src={p.images[0]}
                    alt={p.name}
                    className="absolute inset-0"
                    imgClassName="h-full w-full object-cover transition group-hover:scale-105"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        No image
                      </div>
                    }
                  />
                  {p.status === 'SOLD_OUT' ? (
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      Sold out
                    </div>
                  ) : null}
                </div>
                <div className="p-2">
                  <div className="line-clamp-2 text-xs font-medium text-ink">{p.name}</div>
                  <div className="num mt-0.5 text-sm font-bold text-brand-600">
                    {formatNaira(p.price)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
