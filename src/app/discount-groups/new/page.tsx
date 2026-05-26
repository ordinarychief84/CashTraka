import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CreateDiscountGroupPage() {
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

        <div className="flex-1 min-w-0 flex justify-end">
          <div className="w-full max-w-lg">
            <h1 className="mb-5 text-xl font-bold text-ink">Create discount group</h1>

            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Number</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Discount (%)</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    className="min-w-0 flex-1 rounded-l-md border border-r-0 border-slate-300 px-3 py-2 text-right text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <span className="flex items-center rounded-r-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-[13px] text-slate-500">%</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
                >
                  Create discount group
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
