import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ExpenseForm } from '@/components/ExpenseForm';

export const dynamic = 'force-dynamic';

export default async function NewExpensePage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add expense" backHref="/expenses" />
      <div className="card p-5">
        <ExpenseForm redirectTo="/expenses" />
      </div>
    </AppShell>
  );
}
