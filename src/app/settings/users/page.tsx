import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { workspaceUsersService } from '@/lib/services/workspace-users.service';

export const dynamic = 'force-dynamic';

export default async function SettingsUsersListPage() {
  const user = await guardWithPermission('settings.read');
  const rows = await workspaceUsersService.listForUser(user.id);

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
          <div className="mb-5 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink md:text-2xl">
              <span className="text-slate-400">{rows.length}</span> Users
            </h1>
            <Link
              href="/settings/users/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={13} />
              Create new
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.length === 0 ? (
              <div className="px-6 py-12 text-center text-[13px] text-slate-500">
                No users yet. Add a teammate so they can log in to your workspace.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">E-mail</th>
                    <th className="px-4 py-2.5">User type</th>
                    <th className="px-4 py-2.5">Language</th>
                    <th className="w-12 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/settings/users/${r.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.email ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.userType === 'SCANNER' ? 'Scanner' : 'Standard'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.language}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/settings/users/${r.id}`}
                          className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Edit user"
                        >
                          <Pencil size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
