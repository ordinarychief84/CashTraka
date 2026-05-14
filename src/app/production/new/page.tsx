import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ProductionOrderForm } from '@/components/ops/ProductionOrderForm';

export const dynamic = 'force-dynamic';

export default async function NewProductionOrderPage() {
  const user = await guard();

  // Pull producable products + open customer orders for the linker.
  const [products, customerOrders] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { name: 'asc' },
      take: 500,
      select: {
        id: true,
        name: true,
        sku: true,
        canBeProduced: true,
        defaultBatchSize: true,
        defaultProductionLeadTimeDays: true,
        recipe: { select: { id: true, status: true } },
      },
    }),
    prisma.customerOrder.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED'] },
        productionOrderId: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        items: { select: { description: true } },
      },
    }),
  ]);

  const productOpts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    canBeProduced: p.canBeProduced ?? false,
    hasRecipe:
      Boolean(p.recipe?.id) && (p.recipe?.status ?? 'ACTIVE') === 'ACTIVE',
    defaultBatchSize: p.defaultBatchSize,
    defaultProductionLeadTimeDays: p.defaultProductionLeadTimeDays,
  }));

  const orderOpts = customerOrders.map((co) => ({
    id: co.id,
    orderNumber: co.orderNumber,
    customerName: co.customerName,
    productNames: co.items.map((it) => it.description),
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
        title="New production run"
        subtitle="Plan a batch — by default for stock, or link to an open customer order"
        backHref="/production"
      />
      <ProductionOrderForm products={productOpts} customerOrders={orderOpts} />
    </AppShell>
  );
}
