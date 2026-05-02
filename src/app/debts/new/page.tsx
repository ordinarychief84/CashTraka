import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { DebtForm } from '@/components/DebtForm';

export const dynamic = 'force-dynamic';

export default async function NewDebtPage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add debt" backHref="/debts" />
      <div className="card p-5">
        <DebtForm redirectTo="/debts" />
      </div>
    </AppShell>
  );
}
