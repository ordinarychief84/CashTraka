import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PropertyForm } from '@/components/PropertyForm';

export const dynamic = 'force-dynamic';

export default async function NewPropertyPage() {
  const user = await guard();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader title="Add property" backHref="/properties" />
      <PropertyForm />
    </AppShell>
  );
}
