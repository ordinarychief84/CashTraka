import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';

export const dynamic = 'force-dynamic';

// Simple create form — no DB model yet, stub submits to /api/customer-groups once wired.
export default async function NewCustomerGroupPage() {
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

        <div className="flex-1 min-w-0 flex justify-center pt-4">
          <div className="w-full max-w-md">
            <h1 className="mb-2 text-xl font-bold text-slate-900">
              Create customer group
            </h1>

            {/* Information tab underline */}
            <div className="mb-5 flex border-b border-slate-200">
              <button
                type="button"
                className="border-b-2 border-brand-600 pb-2 pr-4 text-[13px] font-semibold text-brand-700"
              >
                Information
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Number */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
                  Number
                </label>
                <input
                  type="text"
                  placeholder=""
                  className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                />
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
                  Name
                </label>
                <input
                  type="text"
                  placeholder=""
                  className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                />
              </div>

              {/* Discount */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
                  Discount (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue="0.00"
                    className="h-9 w-full rounded-md border border-slate-300 px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">%</span>
                </div>
              </div>

              {/* Update discount on customers checkbox */}
              <div className="mb-6">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                  />
                  Update discount on customers
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
                >
                  Create customer group
                </button>
                <button
                  type="button"
                  className="text-[13px] font-medium text-slate-600 hover:text-slate-800"
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
