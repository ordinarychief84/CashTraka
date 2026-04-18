import { guardForBusinessType } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PropertyForm } from '@/components/PropertyForm';

export const dynamic = 'force-dynamic';

export default async function NewPropertyPage() {
  const user = await guardForBusinessType('properties');

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add property" backHref="/properties" />
      <PropertyForm />
    </AppShell>
  );
}
