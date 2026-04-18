import { notFound } from 'next/navigation';
import { guardWithPermission } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StaffForm } from '@/components/StaffForm';

export const dynamic = 'force-dynamic';

export default async function EditStaffPage({ params }: { params: { id: string } }) {
  const user = await guardWithPermission('team.write');
  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!member) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title={`Edit ${member.name}`} backHref="/team" />
      <StaffForm
        initial={{
          id: member.id,
          name: member.name,
          phone: member.phone ?? '',
          pin: member.pin ?? '',
          role: member.role ?? '',
          payType: member.payType as 'monthly' | 'weekly' | 'daily' | 'per_task',
          payAmount: member.payAmount,
          startDate: member.startDate,
          bankName: member.bankName ?? '',
          bankAccountNumber: member.bankAccountNumber ?? '',
          bankAccountName: member.bankAccountName ?? '',
          nextOfKinName: member.nextOfKinName ?? '',
          nextOfKinPhone: member.nextOfKinPhone ?? '',
          notes: member.notes ?? '',
        }}
      />
    </AppShell>
  );
}
