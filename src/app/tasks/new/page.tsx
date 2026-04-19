import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TaskForm } from '@/components/TaskForm';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add task" backHref="/tasks" />
      <div className="card p-5">
        <TaskForm redirectTo="/tasks" />
      </div>
    </AppShell>
  );
}
