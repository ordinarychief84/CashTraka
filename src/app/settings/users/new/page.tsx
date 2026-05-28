import Link from 'next/link';
import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { CreateUserForm } from '@/components/settings/CreateUserForm';
import { languagesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

export default async function SettingsUsersNewPage() {
  const user = await guardWithPermission('settings.write');
  const languages = await languagesService.listForUser(user.id);

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
            <h1 className="text-xl font-bold text-ink md:text-2xl">Create user</h1>
          </div>

          <CreateUserForm
            languages={languages.map((l) => ({ code: l.code, name: l.name }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
