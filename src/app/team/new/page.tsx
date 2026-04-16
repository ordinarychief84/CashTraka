import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StaffForm } from '@/components/StaffForm';

export const dynamic = 'force-dynamic';

export default async function NewStaffPage() {
  const user = await guardWithPermission('team.write');
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add team member" backHref="/team" />
      <StaffForm />
    </AppShell>
  );
}
