import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [
    payments,
    debts,
    latestDebt,
    properties,
    tenants,
    latestProperty,
    latestTenant,
  ] = await Promise.all([
    prisma.payment.count({ where: { userId: user.id } }),
    prisma.debt.count({ where: { userId: user.id } }),
    prisma.debt.findFirst({
      where: { userId: user.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.property.count({ where: { userId: user.id } }),
    prisma.tenant.count({ where: { userId: user.id } }),
    prisma.property.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { property: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
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
    latestProperty: latestProperty
      ? { id: latestProperty.id, name: latestProperty.name }
      : null,
    latestTenant: latestTenant
      ? {
          id: latestTenant.id,
          name: latestTenant.name,
          phone: latestTenant.phone,
          rentAmount: latestTenant.rentAmount,
          propertyName: latestTenant.property.name,
        }
      : null,
  });
}
