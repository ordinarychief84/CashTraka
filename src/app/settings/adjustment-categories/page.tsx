import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import {
  AdjustmentCategoriesManager,
  type AdjustmentCategoryRow,
} from '@/components/settings/AdjustmentCategoriesManager';
import { adjustmentCategoriesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

export default async function SettingsAdjustmentCategoriesPage() {
  const user = await guardWithPermission('settings.read');
  const rows = await adjustmentCategoriesService.listForUser(user.id);
  const initial: AdjustmentCategoryRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
  }));

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
            <h1 className="text-xl font-bold text-ink md:text-2xl">Adjustment categories</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Reason codes for stock adjustments and write-offs (damage, expiry,
              count correction). Categories appear in the dropdown when you
              record an inventory adjustment.
            </p>
          </div>

          <AdjustmentCategoriesManager initialRows={initial} />
        </div>
      </div>
    </AppShell>
  );
}
