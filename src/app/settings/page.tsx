import Link from 'next/link';
import { Settings as SettingsIcon } from 'lucide-react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsOverviewRow } from '@/components/settings-dashboard/SettingsOverviewRow';
import { SettingsDetailGrid } from '@/components/settings-dashboard/SettingsDetailGrid';

export const dynamic = 'force-dynamic';

export default async function SettingsDashboardPage() {
  const user = await guardWithPermission('settings.write');

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your business preferences and system configurations.
          </p>
        </div>
        <Link href="/settings/edit" className="btn-pill-primary">
          <SettingsIcon size={14} />
          Edit Settings
        </Link>
      </div>

      {/* Settings overview entry cards */}
      <SettingsOverviewRow />

      {/* 6 detail cards */}
      <SettingsDetailGrid userId={user.id} />

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-slate-500">
        <span>© {new Date().getFullYear()} CashTraka Ltd. All rights reserved.</span>
        <span>Logged in as {user.name ?? 'Admin'}</span>
      </footer>
    </AppShell>
  );
}
