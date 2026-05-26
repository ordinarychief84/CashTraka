import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ReportingSubNav } from '@/components/ReportingSubNav';

export const dynamic = 'force-dynamic';

export default async function ValuationPage() {
  const user = await guard();

  const today = new Date().toISOString().split('T')[0].split('-').reverse().join('-');

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <ReportingSubNav />

        <div className="flex-1 min-w-0">
          <h1 className="mb-5 text-xl font-bold text-ink">Valuation</h1>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Product column */}
              <div className="space-y-5">
                <h2 className="text-[13px] font-semibold text-ink">Product</h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Product
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="From"
                      className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <input
                      type="text"
                      placeholder="To"
                      className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Item group
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="From"
                      className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <input
                      type="text"
                      placeholder="To"
                      className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
              </div>

              {/* Miscellaneous column */}
              <div className="space-y-5">
                <h2 className="text-[13px] font-semibold text-ink">Miscellaneous</h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Primo
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Ultimo
                  </label>
                  <input
                    type="date"
                    defaultValue={today}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Location
                  </label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option value="">Select location</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Show empty items
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Show items with negative value
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Show barred items
              </label>
            </div>

            {/* Search */}
            <div className="mt-6">
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
