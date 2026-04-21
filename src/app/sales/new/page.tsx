import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { RecordSaleForm } from '@/components/RecordSaleForm';

export const dynamic = 'force-dynamic';

export default async function NewSalePage() {
  const user = await guardForBusinessType('sales');

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <Link href="/sales" className="mb-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft size={16} /> Back
      </Link>
      <PageHeader
        title="Record Sale"
        subtitle="Add items sold, select payment method, and generate a receipt."
      />
      <RecordSaleForm />
    </AppShell>
  );
}
