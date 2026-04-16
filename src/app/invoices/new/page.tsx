import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { InvoiceForm } from '@/components/InvoiceForm';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="New invoice" backHref="/invoices" />
      <div className="card p-5">
        <InvoiceForm />
      </div>
    </AppShell>
  );
}
