import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StaffForm } from '@/components/StaffForm';

export const dynamic = 'force-dynamic';

export default async function EditStaffPage({ params }: { params: { id: string } }) {
  const user = await guard();
  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!member) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader title={`Edit ${member.name}`} backHref="/team" />
      <div className="card p-5">
        <StaffForm
          initial={{
            id: member.id,
            name: member.name,
            phone: member.phone ?? '',
            pin: member.pin ?? '',
            role: member.role ?? '',
            hourlyRate: member.hourlyRate,
            dailyRate: member.dailyRate,
          }}
        />
      </div>
    </AppShell>
  );
}
