import { guardWithFeature } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ReportsTabNav } from '@/components/ReportsTabNav';
import dynamic from 'next/dynamic';

export const revalidate = 0;

const PnLClient = dynamic(() => import('@/components/PnLClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
    </div>
  ),
});

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
