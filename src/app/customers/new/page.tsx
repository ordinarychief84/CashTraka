import { guard } from '@/lib/guard';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { NewCustomerForm } from '@/components/customers/NewCustomerForm';

export const dynamic = 'force-dynamic';

export default async function NewCustomerPage() {
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
        <SalesSubNav />

        <div className="flex-1 min-w-0">
          <NewCustomerForm />
        </div>
      </div>
    </AppShell>
  );
}
