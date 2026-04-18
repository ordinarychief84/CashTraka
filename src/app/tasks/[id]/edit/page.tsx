import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TaskForm } from '@/components/TaskForm';

export const dynamic = 'force-dynamic';

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const user = await guard();
  const task = await prisma.task.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!task) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Edit task" backHref="/tasks" />
      <div className="card p-5">
        <TaskForm
          redirectTo="/tasks"
          initial={{
            id: task.id,
            title: task.title,
            description: task.description,
            assignedToId: task.assignedToId,
            priority: task.priority,
            dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          }}
        />
      </div>
    </AppShell>
  );
}
