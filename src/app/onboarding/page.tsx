import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Onboarding } from '@/components/Onboarding';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.emailVerified) redirect('/verify-email');
  if (user.onboardingCompleted) redirect('/dashboard');

  const [payments, debts, latestDebt] = await Promise.all([
    prisma.payment.count({ where: { userId: user.id } }),
    prisma.debt.count({ where: { userId: user.id } }),
    prisma.debt.findFirst({
      where: { userId: user.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <Onboarding
      firstName={user.name.split(' ')[0] || ''}
      // Landlord vertical removed during the small-batch ops pivot.
      // Onboarding is now seller-only — the Onboarding component still
      // accepts `businessType` for back-compat but only renders the seller flow.
      businessType="seller"
      initial={{
        payments,
        debts,
        latestDebt: latestDebt
          ? {
              id: latestDebt.id,
              customerName: latestDebt.customerNameSnapshot,
              phone: latestDebt.phoneSnapshot,
              amountOwed: latestDebt.amountOwed,
            }
          : null,
        properties: 0,
        tenants: 0,
        latestProperty: null,
        latestTenant: null,
      }}
    />
  );
}
