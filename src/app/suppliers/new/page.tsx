import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { NewSupplierForm } from '@/components/suppliers/NewSupplierForm';

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
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <PurchasingSubNav />

        <div className="flex-1 min-w-0">
          <NewSupplierForm />
        </div>
      </div>
    </AppShell>
  );
}
