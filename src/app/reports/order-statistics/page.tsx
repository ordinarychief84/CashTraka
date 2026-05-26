import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ReportingSubNav } from '@/components/ReportingSubNav';

export const dynamic = 'force-dynamic';

export default async function OrderStatisticsPage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <ReportingSubNav />
        <div className="flex-1 min-w-0">
          <h1 className="mb-5 text-xl font-bold text-ink">Order statistics</h1>
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 text-[13px]">
            Coming soon
          </div>
        </div>
      </div>
    </AppShell>
  );
}
