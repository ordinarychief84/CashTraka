import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TenantForm } from '@/components/TenantForm';

export const dynamic = 'force-dynamic';

export default async function EditTenantPage({ params }: { params: { id: string } }) {
  const user = await guard();

  const tenant = await prisma.tenant.findFirst({
    where: { id: params.id, userId: user.id },
    include: { property: true },
  });
  if (\!tenant) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Edit tenant" backHref={`/tenants/${tenant.id}`} />
      <TenantForm
        initial={{
          id: tenant.id,
          propertyId: tenant.propertyId,
          name: tenant.name,
          phone: tenant.phone,
          unitLabel: tenant.unitLabel,
          rentAmount: tenant.rentAmount,
          rentDueDay: tenant.rentDueDay,
          rentFrequency: tenant.rentFrequency,
          leaseStart: tenant.leaseStart ? tenant.leaseStart.toISOString().slice(0, 10) : null,
          leaseEnd: tenant.leaseEnd ? tenant.leaseEnd.toISOString().slice(0, 10) : null,
        }}
      />
    </AppShell>
  );
}
