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

  const isPm = user.businessType === 'property_manager';

  const [payments, debts, latestDebt, properties, tenants, latestProperty, latestTenant] = await Promise.all([
    prisma.payment.count({ where: { userId: user.id } }),
    prisma.debt.count({ where: { userId: user.id } }),
    prisma.debt.findFirst({ where: { userId: user.id, status: 'OPEN' }, orderBy: { createdAt: 'desc' } }),
    prisma.property.count({ where: { userId: user.id } }),
    prisma.tenant.count({ where: { userId: user.id } }),
    prisma.property.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.tenant.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { property: { select: { name: true } } } }),
  ]);

  return (
    <Onboarding
      firstName={user.name.split(' ')[0] || ''}
      businessType={user.businessType || 'seller'}
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
        properties,
        tenants,
        latestProperty: latestProperty ? { id: latestProperty.id, name: latestProperty.name } : null,
        latestTenant: latestTenant
          ? {
              id: latestTenant.id,
              name: latestTenant.name,
              phone: latestTenant.phone,
              rentAmount: latestTenant.rentAmount,
              propertyName: latestTenant.property.name,
            }
          : null,
      }}
    />
  );
}
