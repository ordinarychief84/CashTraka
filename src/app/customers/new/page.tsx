import { guard } from '@/lib/guard';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerForm } from '@/components/customers/CustomerForm';

export const dynamic = 'force-dynamic';

export default async function NewCustomerPage() {
  const user = await guard();
  if (user.businessType === 'property_manager') redirect('/tenants');

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader title="New Client" backHref="/customers" />
      <CustomerForm redirectTo="/customers" />
    </AppShell>
  );
}
