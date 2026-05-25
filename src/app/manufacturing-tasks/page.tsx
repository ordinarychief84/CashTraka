import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';
import { ManufacturingTasksPageShell } from '@/components/ops/ManufacturingTasksPageShell';
import type { TaskRow } from '@/components/ops/ManufacturingTasksTable';

export const dynamic = 'force-dynamic';

export default async function ManufacturingTasksPage() {
  const user = await guard();

  const { rows: tasks } = await manufacturingTaskService.listForUser(user.id, { take: 200 });

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    taskNumber: t.taskNumber,
    title: t.title,
    status: t.status,
    priority: t.priority,
    taskType: t.taskType,
    targetQty: t.targetQty,
    completedQty: t.completedQty,
    progress: t.progress,
    plannedStartAt: t.plannedStartAt ? t.plannedStartAt.toISOString() : null,
    plannedEndAt: t.plannedEndAt ? t.plannedEndAt.toISOString() : null,
    productionOrderId: t.productionOrderId ?? null,
    productionOrderNumber: t.productionOrder?.productionNumber ?? null,
    productionOrderTitle: t.productionOrder?.title ?? null,
    workerNames: t.workers.map((w) => w.staffMember.name),
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <ManufacturingTasksPageShell rows={rows} />
    </AppShell>
  );
}
