import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { SupplierForm } from '@/components/ops/SupplierForm';

export const dynamic = 'force-dynamic';

export default async function NewSupplierPage() {
  const user = await guard();
  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader title="Add supplier" backHref="/suppliers" />
      <div className="card p-5">
        <SupplierForm />
      </div>
    </AppShell>
  );
}
