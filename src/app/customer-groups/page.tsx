import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { CustomerGroupsTable, type CustomerGroupRow } from '@/components/sales/CustomerGroupsTable';

export const dynamic = 'force-dynamic';

// Customer groups are not yet stored in the DB — scaffold page with empty state.
const STATIC_GROUPS: CustomerGroupRow[] = [];

export default async function CustomerGroupsPage() {
  const user = await guard();

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <SalesSubNav />

        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {STATIC_GROUPS.length} Customer groups
            </h1>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              + Create new
            </button>
          </div>

          <CustomerGroupsTable rows={STATIC_GROUPS} />
        </div>
      </div>
    </AppShell>
  );
}
