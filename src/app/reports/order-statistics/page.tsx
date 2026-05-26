import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ReportingSubNav } from '@/components/ReportingSubNav';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrderStatisticsPage() {
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
        <ReportingSubNav />

        <div className="flex-1 min-w-0">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-xl font-bold text-ink">Order statistics</h1>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={14} />
              Download sheet ▾
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

              {/* Status column */}
              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold text-ink">Status</h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Archived</label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option>Not archived</option>
                    <option>Archived</option>
                    <option>All</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Status</label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option>All</option>
                    <option>New</option>
                    <option>Confirmed</option>
                    <option>In production</option>
                    <option>Ready</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Delivered</label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option>All</option>
                    <option>Delivered</option>
                    <option>Not delivered</option>
                  </select>
                </div>
              </div>

              {/* Employee column */}
              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold text-ink">Employee</h2>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Employee</label>
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
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Date from</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Date to</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Delivery date from</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Delivery date to</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
            </div>

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
