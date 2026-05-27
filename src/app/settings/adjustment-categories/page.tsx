import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { SettingsPlaceholder } from '@/components/settings/SettingsPlaceholder';

export const dynamic = 'force-dynamic';

export default async function SettingsAdjustmentCategoriesPage() {
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
            title="Adjustment categories"
            subtitle="Reason codes for stock adjustments and write-offs (damage, expiry, count correction)."
          />
        </div>
      </div>
    </AppShell>
  );
}
