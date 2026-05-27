import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { OffersTable, type OfferRow } from '@/components/sales/OffersTable';
import { OffersPageHeader } from '@/components/sales/OffersPageHeader';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const user = await guard();

  const [orders, rawCustomers] = await Promise.all([
    prisma.customerOrder.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      take: 500,
      select: { id: true, name: true },
    }),
  ]);

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

  const customers = rawCustomers.map((c, i) => ({
    id: c.id,
    name: c.name,
    email: null as string | null,
    number: 1001 + i,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <SalesSubNav />

        <div className="flex-1 min-w-0">
          <OffersPageHeader rowCount={rows.length} customers={customers} />
          <OffersTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
