import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { CreatePayLinkForm } from '@/components/paylinks/CreatePayLinkForm';

export const dynamic = 'force-dynamic';

export default async function NewPayLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; phone?: string; amount?: string; debtId?: string }>;
}) {
  const user = await guard();
  const sp = await searchParams;

  // Pre-load customers for autocomplete
  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, phone: true },
    orderBy: { lastActivityAt: 'desc' },
    take: 200,
  });

  // Pre-load open debts for optional linking
  const debts = await prisma.debt.findMany({
    where: { userId: user.id, status: 'OPEN' },
    select: { id: true, customerNameSnapshot: true, phoneSnapshot: true, amountOwed: true, amountPaid: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Create PayLink</h1>
        <p className="mb-6 text-sm text-slate-500">
          Generate a payment request link to share via WhatsApp
        </p>
        <CreatePayLinkForm
          customers={customers}
          debts={debts.map((d) => ({
            id: d.id,
            customerName: d.customerNameSnapshot,
            phone: d.phoneSnapshot,
            remaining: d.amountOwed - d.amountPaid,
          }))}
          prefill={{
            name: sp.name || '',
            phone: sp.phone || '',
            amount: sp.amount || '',
            debtId: sp.debtId || '',
          }}
          defaultBusinessName={user.businessName || ''}
        />
      </div>
    </AppShell>
  );
}
