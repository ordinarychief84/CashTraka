import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ExpenseForm } from '@/components/ExpenseForm';

export const dynamic = 'force-dynamic';

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const user = await guard();
  const expense = await prisma.expense.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!expense) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader title="Edit expense" backHref="/expenses" />
      <div className="card p-5">
        <ExpenseForm
          redirectTo="/expenses"
          initial={{
            id: expense.id,
            amount: expense.amount,
            category: expense.category,
            note: expense.note ?? '',
            incurredOn: expense.incurredOn.toISOString().slice(0, 10),
          }}
        />
      </div>
    </AppShell>
  );
}
