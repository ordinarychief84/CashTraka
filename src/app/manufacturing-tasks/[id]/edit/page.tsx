import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ManufacturingTaskForm } from '@/components/ops/ManufacturingTaskForm';

export const dynamic = 'force-dynamic';

export default async function EditManufacturingTaskPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await guard();

  const [task, productionOrders, staffMembers] = await Promise.all([
    prisma.manufacturingTask.findFirst({
      where: { id: params.id, userId: user.id, deletedAt: null },
      include: {
        workers: { select: { staffMemberId: true } },
      },
    }),
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

  if (!task) notFound();

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Edit Task"
        subtitle={`Editing ${task.taskNumber} — ${task.title}`}
        backHref={`/manufacturing-tasks/${task.id}`}
      />
      <div className="mx-auto max-w-2xl">
        <div className="card p-6">
          <ManufacturingTaskForm
            productionOrders={productionOrders}
            staffMembers={staffMembers}
            initial={{
              id: task.id,
              title: task.title,
              description: task.description,
              taskType: task.taskType,
              priority: task.priority,
              productionOrderId: task.productionOrderId,
              targetQty: task.targetQty,
              plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
              plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
              notes: task.notes,
              workerIds: task.workers.map((w) => w.staffMemberId),
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
