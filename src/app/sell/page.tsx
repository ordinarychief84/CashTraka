import Link from 'next/link';
import { ExternalLink, Eye, MessageCircle, Package, Settings as SettingsIcon } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { formatNaira, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SellOverviewPage() {
  const user = await guard();

  const [productCount, publishedCount, recentEvents, topProducts] = await Promise.all([
    prisma.product.count({ where: { userId: user.id, archived: false } }),
    prisma.product.count({ where: { userId: user.id, archived: false, isPublished: true } }),
    prisma.catalogEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { product: { select: { name: true } } },
    }),
    prisma.catalogEvent.groupBy({
      by: ['productId'],
      where: { userId: user.id, type: 'WHATSAPP_ORDER', productId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 5,
    }),
  ]);

  const topProductIds = topProducts.map((t) => t.productId).filter(Boolean) as string[];
  const topProductRows = topProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, price: true },
      })
    : [];
  const topProductMap = new Map(topProductRows.map((p) => [p.id, p]));

  const slug = user.slug ?? null;
  const catalogEnabled = !!user.catalogEnabled && !!slug;
  const baseUrl = process.env.APP_URL || '';
  const publicUrl = slug ? `${baseUrl}/store/${slug}` : null;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Sell"
        subtitle="Your public catalog. Customers browse, order on WhatsApp, you record the payment — receipt auto-generates."
        action={
          catalogEnabled ? (
            <Link
              href={publicUrl!}
              target="_blank"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ExternalLink size={16} />
              View store
            </Link>
          ) : (
            <Link href="/settings?tab=storefront" className="btn-primary inline-flex items-center gap-2">
              <SettingsIcon size={16} />
              Set up storefront
            </Link>
          )
        }
      />

      {/* Summary cards */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Catalog status"
          value={catalogEnabled ? 'Live' : 'Off'}
          tone={catalogEnabled ? 'success' : 'muted'}
        />
        <SummaryCard
          label="Published products"
          value={`${publishedCount} / ${productCount}`}
          tone="muted"
        />
        <SummaryCard
          label="Order clicks (last 10)"
          value={String(
            recentEvents.filter((e) => e.type === 'WHATSAPP_ORDER').length,
          )}
          tone="muted"
        />
        <SummaryCard
          label="Storefront URL"
          value={slug ?? '—'}
          tone={slug ? 'success' : 'muted'}
          mono
        />
      </div>

      {/* Quick links */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/sell/products"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-500"
        >
          <Package size={16} /> Manage products
        </Link>
        <Link
          href="/sell/share"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-500"
        >
          <MessageCircle size={16} /> Share link
        </Link>
        <Link
          href="/sell/preview"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-500"
        >
          <Eye size={16} /> Preview
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="rounded-xl border border-border bg-white">
          <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent activity
          </div>
          {recentEvents.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No catalog activity yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <div
                    className={
                      e.type === 'WHATSAPP_ORDER'
                        ? 'mt-1 h-2 w-2 rounded-full bg-[#25D366]'
                        : 'mt-1 h-2 w-2 rounded-full bg-slate-300'
                    }
                  />
                  <div className="flex-1">
                    <div className="font-medium text-ink">
                      {e.type === 'WHATSAPP_ORDER' ? 'WhatsApp order' : 'View'}
                      {e.product?.name ? ` — ${e.product.name}` : ''}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(e.createdAt)}
                      {e.customerName ? ` · ${e.customerName}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top products */}
        <div className="rounded-xl border border-border bg-white">
          <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Most clicked (orders)
          </div>
          {topProducts.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No order clicks yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topProducts.map((t, idx) => {
                const product = t.productId ? topProductMap.get(t.productId) : null;
                if (!product) return null;
                return (
                  <li key={t.productId ?? idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <div className="font-medium text-ink">{product.name}</div>
                      <div className="num text-xs text-slate-500">{formatNaira(product.price)}</div>
                    </div>
                    <div className="text-sm font-bold text-brand-600">{t._count._all}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone: 'success' | 'muted';
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={
          (tone === 'success' ? 'text-success-700 ' : 'text-ink ') +
          (mono ? 'font-mono ' : '') +
          'mt-1 truncate text-lg font-bold'
        }
      >
        {value}
      </div>
    </div>
  );
}
