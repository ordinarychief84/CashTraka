import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ManufacturingTaskForm } from '@/components/ops/ManufacturingTaskForm';

export const dynamic = 'force-dynamic';

export default async function NewManufacturingTaskPage({
  searchParams,
}: {
  searchParams: { productionOrderId?: string };
}) {
  const user = await guard();

  const [productionOrders, staffMembers] = await Promise.all([
    prisma.productionOrder.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, productionNumber: true, title: true, status: true },
    }),
    prisma.staffMember.findMany({
      where: { userId: user.id, status: 'active' },
      orderBy: { name: 'asc' },
      take: 100,
      select: { id: true, name: true, role: true },
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
      <PageHeader
        title="New Manufacturing Task"
        subtitle="Create a discrete production step for your team to execute."
        backHref="/manufacturing-tasks"
      />
      <div className="mx-auto max-w-2xl">
        <div className="card p-6">
          <ManufacturingTaskForm
            productionOrders={productionOrders}
            staffMembers={staffMembers}
            defaultProductionOrderId={searchParams.productionOrderId}
          />
        </div>
      </div>
    </AppShell>
  );
}
