import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TenantForm } from '@/components/TenantForm';

export const dynamic = 'force-dynamic';

type SP = { propertyId?: string; fromTenant?: string };

export default async function NewTenantPage({ searchParams }: { searchParams: SP }) {
  const user = await guardForBusinessType('tenants');
  const propertyId = searchParams.propertyId || '';
  const fromTenantId = searchParams.fromTenant || '';

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // If adding another unit for an existing tenant, pre-fill their info
  let prefill: { name: string; phone: string } | undefined;
  if (fromTenantId) {
    const existing = await prisma.tenant.findFirst({
      where: { id: fromTenantId, userId: user.id },
      select: { name: true, phone: true },
    });
    if (existing) {
      prefill = { name: existing.name, phone: existing.phone };
    }
  }

  const backHref = propertyId ? `/properties/${propertyId}` : fromTenantId ? `/tenants/${fromTenantId}` : '/properties';
  const title = prefill ? `Add another unit for ${prefill.name}` : 'Add tenant';

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title={title} backHref={backHref} />
      {prefill && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Adding a new unit for <strong>{prefill.name}</strong> ({prefill.phone}). Choose a different property or unit below.
        </div>
      )}
      <TenantForm propertyId={propertyId} properties={properties} prefill={prefill} />
    </AppShell>
  );
}
