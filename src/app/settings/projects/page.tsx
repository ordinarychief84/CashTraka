import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { SettingsPlaceholder } from '@/components/settings/SettingsPlaceholder';

export const dynamic = 'force-dynamic';

export default async function SettingsProjectsPage() {
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
          <SettingsPlaceholder
            title="Projects"
            subtitle="Group orders, expenses and invoices by project for cost tracking and reporting."
          />
        </div>
      </div>
    </AppShell>
  );
}
