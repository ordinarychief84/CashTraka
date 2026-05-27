import Link from 'next/link';
import { Plus } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { SupplierGroupsTable, type SupplierGroupRow } from '@/components/suppliers/SupplierGroupsTable';

export const dynamic = 'force-dynamic';

// No SupplierGroup model yet — start with an empty list.
// Create the DB model in a future sprint when group management is needed.
const STATIC_GROUPS: SupplierGroupRow[] = [];

export default async function SupplierGroupsPage() {
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
        <PurchasingSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {STATIC_GROUPS.length} Supplier groups
            </h1>
            <Link
              href="/supplier-groups/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={13} />
              Create new
            </Link>
          </div>

          <SupplierGroupsTable rows={STATIC_GROUPS} />
        </div>
      </div>
    </AppShell>
  );
}
