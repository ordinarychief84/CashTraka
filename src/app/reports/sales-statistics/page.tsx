import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ReportingSubNav } from '@/components/ReportingSubNav';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

function RangeInput({ label, idFrom, idTo }: { label: string; idFrom: string; idTo: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={idFrom} className="block text-[12px] font-medium text-slate-600">
        {label} from
      </label>
      <div className="flex items-center gap-1">
        <input
          id={idFrom}
          type="text"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>
      </div>
      <label htmlFor={idTo} className="block text-[12px] font-medium text-slate-600">
        {label} to
      </label>
      <div className="flex items-center gap-1">
        <input
          id={idTo}
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
  );
}

export default async function SalesStatisticsPage() {
  const user = await guard();

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 7) + '-01';

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
            <h1 className="text-xl font-bold text-ink">Sales statistics</h1>
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

              {/* Left column — dates + settings */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Date from</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      defaultValue={firstOfMonth}
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Date to</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Based on</label>
                  <select className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option>Employee</option>
                    <option>Customer</option>
                    <option>Product</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Results per page</label>
                  <select className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option>100</option>
                    <option>50</option>
                    <option>200</option>
                    <option>500</option>
                  </select>
                </div>
              </div>

              {/* Middle column — customer group + customer + employee */}
              <div className="space-y-4">
                <RangeInput label="Customer group" idFrom="cg-from" idTo="cg-to" />
                <RangeInput label="Customer" idFrom="c-from" idTo="c-to" />
                <RangeInput label="Employee" idFrom="emp-from" idTo="emp-to" />
              </div>

              {/* Right column — item + item group + location */}
              <div className="space-y-4">
                <RangeInput label="Item" idFrom="item-from" idTo="item-to" />
                <RangeInput label="Item group" idFrom="ig-from" idTo="ig-to" />

                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-slate-600">Location from</label>
                  <select className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option value="">Select location</option>
                  </select>
                  <label className="block text-[12px] font-medium text-slate-600 pt-1">Location to</label>
                  <select className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option value="">Select location</option>
                  </select>
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
