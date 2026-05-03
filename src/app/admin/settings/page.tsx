import { Shield } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { PlatformSettings } from '@/components/admin/PlatformSettings';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const admin = await requireAdminSection('settings');

  // Fetch all system settings
  const systemSettings = await prisma.systemSetting.findMany();
  const settingsMap = systemSettings.reduce(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, string>
  );

  // Ensure all expected settings have values
  const defaultSettings = {
    maintenance_mode: settingsMap.maintenance_mode ?? 'false',
    default_trial_days: settingsMap.default_trial_days ?? '7',
    max_free_customers: settingsMap.max_free_customers ?? '20',
    support_email: settingsMap.support_email ?? '',
    platform_announcement: settingsMap.platform_announcement ?? '',
  };

  return (
    <AdminShell adminName={admin.name} activePath="/admin/settings" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account and platform configuration</p>
      </div>

      {/* Admin Profile Section */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Shield size={18} className="text-slate-400" />
          Admin Profile
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Name
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{admin.name}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{admin.email}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Role
            </div>
            <div className="mt-1">
              <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-success-400">
                {admin.role}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </div>
            <div className="mt-1">
              <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="mb-6">
        <ChangePasswordForm adminEmail={admin.email} />
      </div>

      {/* Platform Settings Form */}
      <div>
        <PlatformSettings initialSettings={defaultSettings} />
      </div>
    </AdminShell>
  );
}
