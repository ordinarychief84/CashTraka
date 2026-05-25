import Link from 'next/link';
import { Plus, Settings2, Upload } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { prisma } from '@/lib/prisma';
import { SuppliersTable, type SupplierRow } from '@/components/suppliers/SuppliersTable';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const user = await guard();

  const suppliers = await prisma.supplier.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
      status: true,
      notes: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows: SupplierRow[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    email: s.email,
    phone: s.phone,
    contactPerson: s.contactPerson,
    notes: s.notes,
    status: s.deletedAt ? 'INACTIVE' : s.status,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">Suppliers</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* IMPORTER button with NEW badge */}
          <button className="relative inline-flex items-center gap-1.5 rounded border border-orange-400 px-3 py-1.5 text-xs font-semibold text-orange-500 hover:bg-orange-50 transition">
            <Upload size={12} />
            IMPORTER
            <span className="absolute -top-2 -right-2 rounded bg-orange-500 px-1 py-0.5 text-[9px] font-bold text-white leading-none">
              NEW
            </span>
          </button>
          <Link
            href="/suppliers/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
          >
            <Plus size={12} /> ADD
          </Link>
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            <Settings2 size={12} /> ADJUST
          </Link>
        </div>
      </div>

      <SuppliersTable rows={rows} createdByName={user.name ?? 'User'} />
    </AppShell>
  );
}
