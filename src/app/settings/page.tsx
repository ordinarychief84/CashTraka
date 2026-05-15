import Link from 'next/link';
import { Save, Download, Activity } from 'lucide-react';
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
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/settings/edit" className="btn-pill-ghost">
            <Activity size={14} />
            Audit Logs
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <Download size={14} />
            Export Settings
          </Link>
          <Link href="/settings/edit" className="btn-pill-primary">
            <Save size={14} />
            Edit Settings
          </Link>
        </div>
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
