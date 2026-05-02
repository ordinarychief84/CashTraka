import Link from 'next/link';
import { Plus, Lock, Eye, EyeOff, Edit3, ImageOff, ExternalLink } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export default async function SellAlbumsPage() {
  const user = await guard();
  const albums = await prisma.album.findMany({
    where: { userId: user.id },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { products: true } },
      products: {
        take: 1,
        orderBy: { position: 'asc' },
        include: { product: { select: { images: true } } },
      },
    },
  });

  const slug = user.slug ?? null;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Albums"
        subtitle="Group products into named collections and share each one with a link, optionally protected by a passcode."
        action={
          <Link href="/showroom/albums/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New album
          </Link>
        }
      />

      {albums.length === 0 ? (
        <EmptyState
          title="No albums yet"
          description="Create your first album, drop products into it, and share the link with customers instead of forwarding individual photos on WhatsApp."
          actionHref="/showroom/albums/new"
          actionLabel="Create album"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => {
            const cover =
              a.coverImageUrl ||
              a.products[0]?.product?.images?.[0] ||
              null;
            return (
              <div key={a.id} className="overflow-hidden rounded-xl border border-border bg-white">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {cover ? (
                    <img src={cover} alt={a.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 text-xs">
                      <ImageOff size={24} />
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{a.title}</div>
                      <div className="text-xs text-slate-500">
                        {a._count.products} {a._count.products === 1 ? 'item' : 'items'} ·{' '}
                        <span className="font-mono">/{a.slug}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {slug ? (
                        <Link
                          href={`/store/${slug}/album/${a.slug}`}
                          target="_blank"
                          title="Preview"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      ) : null}
                      <Link
                        href={`/showroom/albums/${a.id}/edit`}
                        title="Edit"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Edit3 size={14} />
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div
                      className={
                        a.isPublished
                          ? 'inline-flex items-center gap-1 text-xs font-semibold text-success-700'
                          : 'inline-flex items-center gap-1 text-xs font-semibold text-slate-500'
                      }
                    >
                      {a.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                      {a.isPublished ? 'Published' : 'Hidden'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
