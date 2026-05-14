import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerOrderForm } from '@/components/ops/CustomerOrderForm';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const user = await guard();
  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sku: true, priceKobo: true },
      take: 500,
    }),
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { lastActivityAt: 'desc' },
      select: { id: true, name: true, phone: true },
      take: 500,
    }),
  ]);
  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader title="Add order" backHref="/orders" />
      <CustomerOrderForm products={products} customers={customers} />
    </AppShell>
  );
}
