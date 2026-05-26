import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { OffersTable, type OfferRow } from '@/components/sales/OffersTable';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const user = await guard();

  // Offers = CustomerOrders in NEW status (not yet confirmed)
  const orders = await prisma.customerOrder.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      customer: { select: { id: true, name: true } },
    },
  });

  const rows: OfferRow[] = orders.map((o, i) => ({
    id: o.id,
    number: String(1001 + i),
    customerName: o.customerName,
    customerId: o.customerId,
    status: o.status === 'CONFIRMED' || o.status === 'IN_PRODUCTION' || o.status === 'READY' || o.status === 'DELIVERED'
      ? 'ACCEPTED'
      : o.status === 'CANCELLED'
        ? 'REJECTED'
        : 'DRAFT',
    deliveryDate: o.dueAt ? o.dueAt.toISOString() : null,
    totalKobo: o.totalKobo,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <SalesSubNav />

        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Offers
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Export ▾
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create new
              </button>
            </div>
          </div>

          <OffersTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
