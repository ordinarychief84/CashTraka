import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';

export const dynamic = 'force-dynamic';

export default async function CreateUnitPage() {
  const user = await guard();

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <ItemsSubNav />

        <div className="flex-1 min-w-0 flex justify-end">
          <div className="w-full max-w-lg">
            <h1 className="mb-4 text-xl font-bold text-ink">Create unit</h1>

            {/* Tab */}
            <div className="mb-5 border-b border-slate-200">
              <button
                type="button"
                className="border-b-2 border-brand-600 pb-2 text-[13px] font-semibold text-brand-700"
              >
                General
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Abbreviation</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Packaging code</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Barcode</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                />
                Use abbreviation on layouts
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
                >
                  Create unit
                </button>
                <button
                  type="button"
                  className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Create and new
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
