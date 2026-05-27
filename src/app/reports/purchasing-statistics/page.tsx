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

export default async function PurchasingStatisticsPage() {
  const user = await guard();

  const firstOfMonth =
    new Date().getFullYear() +
    '-' +
    String(new Date().getMonth() + 1).padStart(2, '0') +
    '-01';

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
            <h1 className="text-xl font-bold text-ink">Purchasing statistics</h1>
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

              {/* Left column — dates + results */}
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
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Results per page</label>
                  <select className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option>50</option>
                    <option>100</option>
                    <option>200</option>
                    <option>500</option>
                  </select>
                </div>
              </div>

              {/* Middle column — supplier group + supplier */}
              <div className="space-y-4">
                <RangeInput label="Supplier group" idFrom="sg-from" idTo="sg-to" />
                <RangeInput label="Supplier" idFrom="s-from" idTo="s-to" />
              </div>

              {/* Right column — item + item group */}
              <div className="space-y-4">
                <RangeInput label="Item" idFrom="item-from" idTo="item-to" />
                <RangeInput label="Item group" idFrom="ig-from" idTo="ig-to" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                Search
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Remember
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
