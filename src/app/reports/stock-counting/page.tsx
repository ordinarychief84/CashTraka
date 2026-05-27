import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ReportingSubNav } from '@/components/ReportingSubNav';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StockCountingPage() {
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
        <ReportingSubNav />

        <div className="flex-1 min-w-0">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-xl font-bold text-ink">Stock counting</h1>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={14} />
              Download sheet ▾
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">

              {/* Product column */}
              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold text-ink">Product</h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">From</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">To</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Item group column */}
              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold text-ink">Item group</h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">From</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">To</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Miscellaneous column */}
              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold text-ink">Miscellaneous</h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Date to</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Location</label>
                  <div className="flex items-center gap-1">
                    <select className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                      <option value="">Select location</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Exclude column */}
              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold text-ink">
                  Exclude products without transactions
                </h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Select time frame
                  </label>
                  <select className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option value="">Select time frame</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                    <option>Last 6 months</option>
                    <option>Last 12 months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Hide empty items
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Show per location
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Show per variation
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Show only products with variations
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                Hide barred items
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
