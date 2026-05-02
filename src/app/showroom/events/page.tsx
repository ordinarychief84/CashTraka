import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatDateTime } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export default async function CatalogEventsPage() {
  const user = await guard();
  const events = await prisma.catalogEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { product: { select: { name: true } } },
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Catalog activity"
        subtitle="Every view and WhatsApp order click on your storefront."
      />

      {events.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Once you share your catalog link, views and order clicks will show up here."
          actionHref="/showroom/share"
          actionLabel="Share my catalog"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">{formatDateTime(e.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        e.type === 'WHATSAPP_ORDER'
                          ? 'rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700'
                          : 'rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600'
                      }
                    >
                      {e.type === 'WHATSAPP_ORDER' ? 'WhatsApp order' : 'View'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{e.product?.name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <div>{e.customerName ?? '—'}</div>
                    {e.customerPhone ? (
                      <div className="text-xs text-slate-500">{displayPhone(e.customerPhone)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {e.note ? <span className="line-clamp-2">{e.note}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
