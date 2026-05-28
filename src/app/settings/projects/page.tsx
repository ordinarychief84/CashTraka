import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { ProjectsManager, type ProjectRow } from '@/components/settings/ProjectsManager';
import { projectsService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

export default async function SettingsProjectsPage() {
  const user = await guardWithPermission('settings.read');
  const rows = await projectsService.listForUser(user.id);
  const initial: ProjectRow[] = rows.map((r) => ({
    id: r.id,
    number: r.number,
    name: r.name,
    description: r.description,
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
            <h1 className="text-xl font-bold text-ink md:text-2xl">Projects</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Group orders, expenses and invoices by project for cost tracking
              and reporting.
            </p>
          </div>

          <ProjectsManager initialRows={initial} />
        </div>
      </div>
    </AppShell>
  );
}
