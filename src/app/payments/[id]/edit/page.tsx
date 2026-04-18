import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PaymentForm } from '@/components/PaymentForm';

export const dynamic = 'force-dynamic';

export default async function EditPaymentPage({ params }: { params: { id: string } }) {
  const user = await guard();
  const payment = await prisma.payment.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (\!payment) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Edit payment" backHref="/payments" />
      <div className="card p-5">
        <PaymentForm
          redirectTo="/payments"
          initial={{
            id: payment.id,
            customerName: payment.customerNameSnapshot,
            phone: payment.phoneSnapshot,
            amount: payment.amount,
            status: payment.status as 'PAID' | 'PENDING',
          }}
        />
      </div>
    </AppShell>
  );
}
