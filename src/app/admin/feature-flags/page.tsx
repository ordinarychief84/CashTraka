import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { FEATURE_FLAGS, getAllFlagValues } from '@/lib/feature-flags';
import { FeatureFlagToggle } from '@/components/admin/FeatureFlagToggle';

export const dynamic = 'force-dynamic';

const GROUP_LABELS: Record<string, string> = {
  access: 'Access',
  product: 'Product',
  billing: 'Billing',
  integrations: 'Integrations',
  site: 'Site',
};

export default async function AdminFeatureFlagsPage() {
  const admin = await requireAdminSection('flags');
  const current = await getAllFlagValues();

  const grouped = FEATURE_FLAGS.reduce<
    Record<string, typeof FEATURE_FLAGS>
  >((acc, f) => {
    (acc[f.group] ||= []).push(f);
    return acc;
  }, {});

  const order = ['access', 'product', 'billing', 'integrations', 'site'];

  return (
    <AdminShell adminName={admin.name} activePath="/admin/feature-flags" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Feature flags</h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform-wide toggles. Changes take effect immediately for new requests; cached pages
          may take up to a minute to reflect. All changes are written to the audit log when
          performed by a super admin.
        </p>
      </div>

      <div className="space-y-6">
        {order
          .filter((g) => grouped[g]?.length)
          .map((group) => (
            <section
              key={group}
              className="overflow-hidden rounded-xl border border-border bg-white"
            >
              <header className="border-b border-border bg-slate-50 px-4 py-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {GROUP_LABELS[group] || group}
                </h2>
              </header>
              <ul className="divide-y divide-border">
                {grouped[group].map((flag) => (
                  <li
                    key={flag.key}
                    className="flex items-start justify-between gap-4 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{flag.label}</span>
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                          {flag.key}
                        </code>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{flag.description}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Default: {flag.default ? 'on' : 'off'}
                      </p>
                    </div>
                    <FeatureFlagToggle
                      flagKey={flag.key}
                      initialValue={current[flag.key]}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </AdminShell>
  );
}
