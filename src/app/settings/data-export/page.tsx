import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { DataExportTabs } from '@/components/settings/DataExportTabs';

export const dynamic = 'force-dynamic';

export default async function SettingsDataExportPage() {
  const user = await guardWithPermission('settings.read');

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <SettingsSubNav />
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-ink md:text-2xl">Data export</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Download your customers, suppliers, inventory and defaults as
              UTF-8 CSV. Files stream directly to your browser — no scheduling
              or signed-URL step.
            </p>
          </div>

          <DataExportTabs />
        </div>
      </div>
    </AppShell>
  );
}
