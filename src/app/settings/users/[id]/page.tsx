import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { EditUserForm, type EditUserSeed } from '@/components/settings/EditUserForm';
import { workspaceUsersService } from '@/lib/services/workspace-users.service';
import { languagesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

export default async function SettingsUsersEditPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await guardWithPermission('settings.write');

  let target;
  try {
    target = await workspaceUsersService.get(user.id, params.id);
  } catch {
    notFound();
  }

  const languages = await languagesService.listForUser(user.id);
  const seed: EditUserSeed = {
    id: target.id,
    name: target.name,
    email: target.email ?? '',
    language: target.language ?? 'EN',
    userType: (target.userType ?? 'STANDARD') as 'STANDARD' | 'SCANNER',
    autoBookAdjustments: !!target.autoBookAdjustments,
    autoBookMovements: !!target.autoBookMovements,
    associatedEmployee: target.associatedEmployee ?? null,
  };

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
          <div className="mb-5 flex items-center gap-3">
            <Link href="/settings/users" className="text-[13px] text-slate-400 hover:text-slate-600">
              ← Users
            </Link>
            <h1 className="text-xl font-bold text-ink md:text-2xl">
              Edit user <span className="text-slate-400">{target.name}</span>
            </h1>
          </div>

          <EditUserForm
            user={seed}
            languages={languages.map((l) => ({ code: l.code, name: l.name }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
