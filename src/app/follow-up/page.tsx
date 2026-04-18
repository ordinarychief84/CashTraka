import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { FollowUpComposer } from '@/components/FollowUpComposer';
import { isPropertyManager } from '@/lib/business-type';

export const dynamic = 'force-dynamic';

export default async function FollowUpPage({ searchParams }: { searchParams: { customerId?: string; tenantId?: string } }) {
  const user = await guard();
  const isPm = isPropertyManager(user.businessType);

  const [recipients, templates] = await Promise.all([
    isPm
      ? prisma.tenant.findMany({ where: { userId: user.id, status: 'active' }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, phone: true } }).then((ts) => ts.map((t) => ({ id: t.id, name: t.name, phone: t.phone })))
      : prisma.customer.findMany({ where: { userId: user.id }, orderBy: { lastActivityAt: 'desc' }, select: { id: true, name: true, phone: true } }).then((cs) => cs.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))),
    prisma.messageTemplate.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true, body: true } }),
  ]);

  const initialId = (isPm ? searchParams.tenantId : searchParams.customerId) ?? searchParams.customerId ?? null;

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Send follow-up"
        subtitle={isPm ? 'Pick a tenant, edit the message, open WhatsApp.' : 'Pick a customer, edit the message, open WhatsApp.'}
        backHref={isPm ? '/tenants' : '/customers'}
      />
      <div className="card p-5">
        <FollowUpComposer customers={recipients} templates={templates} initialCustomerId={initialId} recipientLabel={isPm ? 'Tenant' : 'Customer'} />
      </div>
    </AppShell>
  );
}
