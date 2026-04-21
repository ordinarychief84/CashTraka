import { Plus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { SalesListClient } from '@/components/SalesListClient';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  const user = await guardForBusinessType('sales');

  const sales = await prisma.sale.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { soldAt: 'desc' },
    take: 500,
  });

  const serialised = sales.map((s) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    customerName: s.customerName,
    customerPhone: s.customerPhone,
    customerEmail: s.customerEmail,
    paymentMethod: s.paymentMethod,
    subtotal: s.subtotal,
    discount: s.discount,
    total: s.total,
    note: s.note,
    soldAt: s.soldAt.toISOString(),
    itemCount: s.items.length,
    itemSummary: s.items
      .slice(0, 2)
      .map((i) => i.description)
      .join(', '),
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Sales"
        subtitle="Walk-in sales recorded today and recent history."
        action={
          <Link href="/sales/new" className="btn-primary">
            <Plus size={18} />
            Record Sale
          </Link>
        }
      />

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No sales recorded yet"
          description="Record your first walk-in sale. Add items, pick payment method, and generate a receipt instantly."
          actionHref="/sales/new"
          actionLabel="Record your first sale"
        />
      ) : (
        <SalesListClient sales={serialised} />
      )}
    </AppShell>
  );
}
