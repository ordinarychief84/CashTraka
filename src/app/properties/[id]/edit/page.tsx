import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PropertyForm } from '@/components/PropertyForm';

export const dynamic = 'force-dynamic';

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const user = await guard();

  const property = await prisma.property.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!property) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Edit property" backHref={`/properties/${property.id}`} />
      <PropertyForm
        initial={{
          id: property.id,
          name: property.name,
          address: property.address,
          unitCount: property.unitCount,
          note: property.note,
        }}
      />
    </AppShell>
  );
}
