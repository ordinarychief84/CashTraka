import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TenantForm } from '@/components/TenantForm';

export const dynamic = 'force-dynamic';

type SP = { propertyId?: string };

export default async function NewTenantPage({ searchParams }: { searchParams: SP }) {
  const user = await guardForBusinessType('tenants');
  const propertyId = searchParams.propertyId || '';

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // Determine back link
  const backHref = propertyId ? `/properties/${propertyId}` : '/properties';

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add tenant" backHref={backHref} />
      <TenantForm propertyId={propertyId} properties={properties} />
    </AppShell>
  );
}
