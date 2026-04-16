import { redirect } from 'next/navigation';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ChecklistForm } from '@/components/ChecklistForm';

export const dynamic = 'force-dynamic';

export default async function NewChecklistPage() {
  const user = await guard();
  if (user.businessType === 'property_manager') redirect('/dashboard');
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Create checklist" backHref="/checklists" />
      <div className="card p-5">
        <ChecklistForm />
      </div>
    </AppShell>
  );
}
