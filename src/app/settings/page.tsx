import Link from 'next/link';
import { Settings as SettingsIcon } from 'lucide-react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { SettingsOverviewRow } from '@/components/settings-dashboard/SettingsOverviewRow';
import { SettingsDetailGrid } from '@/components/settings-dashboard/SettingsDetailGrid';

export const dynamic = 'force-dynamic';

export default async function SettingsGeneralPage() {
  const user = await guardWithPermission('settings.write');

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
          {/* Page header */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink md:text-2xl">General</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Company profile, business identity and FIRS tax compliance.
              </p>
            </div>
            <Link
              href="/settings/edit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              <SettingsIcon size={13} />
              Edit settings
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
        </div>
      </div>
    </AppShell>
  );
}
