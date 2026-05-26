import Link from 'next/link';
import { Plus, Box } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';

export const dynamic = 'force-dynamic';

export default async function DiscountGroupsPage() {
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

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">Discount groups</h1>
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={13} />
              Create new
            </Link>
          </div>

          {/* Empty state card */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Box size={36} />
            </div>
            <p className="mb-6 text-[15px] font-medium text-slate-600">
              No discount groups found.
            </p>
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={13} />
              Create new
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-400 text-center">
            Discount groups let you apply standard discounts to groups of customers. This feature is coming soon.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
