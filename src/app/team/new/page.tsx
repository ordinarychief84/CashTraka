import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StaffForm } from '@/components/StaffForm';

export const dynamic = 'force-dynamic';

export default async function NewStaffPage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader title="Add team member" backHref="/team" />
      <div className="card p-5">
        <StaffForm />
      </div>
    </AppShell>
  );
}
