import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { DebtForm } from '@/components/DebtForm';
import { formatNaira } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EditDebtPage({ params }: { params: { id: string } }) {
  const user = await guard();
  const debt = await prisma.debt.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!debt) notFound();

  const dueDateStr = debt.dueDate
    ? new Date(debt.dueDate).toISOString().slice(0, 10)
    : '';

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader title="Edit debt" backHref="/debts" />
      {debt.amountPaid > 0 && (
        <div className="card mb-4 p-4 text-sm text-slate-600">
          <span className="font-semibold text-ink">{formatNaira(debt.amountPaid)}</span>{' '}
          has already been paid against this debt.
        </div>
      )}
      <div className="card p-5">
        <DebtForm
          redirectTo="/debts"
          initial={{
            id: debt.id,
            customerName: debt.customerNameSnapshot,
            phone: debt.phoneSnapshot,
            amountOwed: debt.amountOwed,
            dueDate: dueDateStr,
          }}
        />
      </div>
    </AppShell>
  );
}
