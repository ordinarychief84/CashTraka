import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { LocationsTable } from '@/components/items/LocationsTable';

export const dynamic = 'force-dynamic';

// Default location data — in a future sprint this will come from a DB model.
// For now we ship one "Default warehouse" location so the table is not empty.
const DEFAULT_LOCATIONS = [
  { id: '1001', number: 1001, name: 'Default Warehouse', isDefault: true, subLocationCount: 0 },
];

export default async function LocationsPage() {
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
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {DEFAULT_LOCATIONS.length} Locations
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Import ▾
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create new
              </button>
            </div>
          </div>

          <LocationsTable locations={DEFAULT_LOCATIONS} />
        </div>
      </div>
    </AppShell>
  );
}
