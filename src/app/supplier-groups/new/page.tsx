import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';

export const dynamic = 'force-dynamic';

// Simple create form — no DB model yet, stub submits to /api/supplier-groups once wired.
export default async function NewSupplierGroupPage() {
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

        <div className="flex-1 min-w-0 flex justify-center pt-4">
          <div className="w-full max-w-md">
            <h1 className="mb-5 text-xl font-bold text-slate-900">
              Create supplier group
            </h1>

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
              <div className="mb-6">
                <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
                  Name
                </label>
                <input
                  type="text"
                  placeholder=""
                  className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
                >
                  Create supplier group
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
