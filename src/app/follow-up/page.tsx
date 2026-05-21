import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { FollowUpComposer } from '@/components/FollowUpComposer';

export const dynamic = 'force-dynamic';

export default async function FollowUpPage(
  props: {
    searchParams: Promise<{ customerId?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await guard();

  const [customers, templates] = await Promise.all([
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { lastActivityAt: 'desc' },
      select: { id: true, name: true, phone: true },
    }),
    prisma.messageTemplate.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, body: true },
    }),
  ]);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Send follow-up"
        subtitle="Pick a customer, edit the message, open WhatsApp."
        backHref="/customers"
      />
      <div className="card p-5">
        <FollowUpComposer
          customers={customers}
          templates={templates}
          initialCustomerId={searchParams.customerId ?? null}
          recipientLabel="Customer"
        />
      </div>
    </AppShell>
  );
}
