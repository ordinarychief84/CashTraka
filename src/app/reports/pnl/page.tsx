import { guardWithFeature } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ReportsTabNav } from '@/components/ReportsTabNav';
import PnLClient from '@/components/PnLClient';

export const dynamic = 'force-dynamic';

export default async function PnLPage() {
  const user = await guardWithFeature('reports');

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Profit & Loss"
        subtitle="Revenue, costs, and net income at a glance."
      />
      <ReportsTabNav active="pnl" />
      <PnLClient />
    </AppShell>
  );
}
