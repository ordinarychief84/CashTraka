import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { ApiKeysManager, type ApiKeyRow } from '@/components/settings/ApiKeysManager';
import { apiKeysService } from '@/lib/services/api-keys.service';

export const dynamic = 'force-dynamic';

export default async function SettingsApiPage() {
  const user = await guardWithPermission('settings.read');
  const rows = await apiKeysService.listForUser(user.id);
  const initial: ApiKeyRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    lastFour: r.lastFour,
    scopes: r.scopes,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
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
            <h1 className="text-xl font-bold text-ink">API</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Issue API keys to connect CashTraka to your own scripts, dashboards
              and integrations. Each key is shown once on creation and stored
              hashed — keep it like a password.
            </p>
          </div>

          <ApiKeysManager initialKeys={initial} />

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-[12px] font-semibold text-slate-700">
              Using your key
            </p>
            <p className="mb-2 text-[12px] text-slate-600">
              Send it as a bearer token on the Authorization header:
            </p>
            <code className="block overflow-x-auto rounded border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-700">
              curl https://app.cashtraka.com/api/customers \<br />
              &nbsp;&nbsp;-H "Authorization: Bearer ct_live_…"
            </code>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
