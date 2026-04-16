import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PaymentForm } from '@/components/PaymentForm';

export const dynamic = 'force-dynamic';

export default async function NewPaymentPage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add payment" backHref="/payments" />
      <div className="card p-5">
        <PaymentForm redirectTo="/payments" enableLineItems />
      </div>
    </AppShell>
  );
}
