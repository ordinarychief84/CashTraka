import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { prisma } from '@/lib/prisma';
import { SuppliersRackbeatTable, type SupplierRackbeatRow } from '@/components/suppliers/SuppliersRackbeatTable';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const user = await guard();

  const suppliers = await prisma.supplier.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
    },
  });

  const rows: SupplierRackbeatRow[] = suppliers.map((s, i) => ({
    id: s.id,
    number: 1001 + i,
    name: s.name,
    vatNo: null,
    email: s.email,
    status: s.status ?? 'ACTIVE',
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <PurchasingSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Suppliers
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Bulk actions ▾
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Import / Export ▾
              </button>
              <Link
                href="/suppliers/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create new
              </Link>
            </div>
          </div>

          <SuppliersRackbeatTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
