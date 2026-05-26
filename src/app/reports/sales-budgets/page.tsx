import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ReportingSubNav } from '@/components/ReportingSubNav';

export const dynamic = 'force-dynamic';

export default async function SalesBudgetsPage() {
  const user = await guard();

  // Default to current year-month (YYYY-MM)
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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
          <h1 className="mb-5 text-xl font-bold text-ink">Sales budgets</h1>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {/* Date range row */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">
                  Date from <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  defaultValue={ym}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">
                  Date to <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  defaultValue={ym}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                />
                Group by period
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                />
                Show only budgeted
              </label>
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
