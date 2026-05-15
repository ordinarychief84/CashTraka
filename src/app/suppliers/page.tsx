import Link from 'next/link';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { prisma } from '@/lib/prisma';
import { SuppliersHeroKpis } from '@/components/suppliers/SuppliersHeroKpis';
import { SuppliersChartRow } from '@/components/suppliers/SuppliersChartRow';
import { SuppliersTable, type SupplierRow } from '@/components/suppliers/SuppliersTable';
import { SuppliersRightRail } from '@/components/suppliers/SuppliersRightRail';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const user = await guard();

  const suppliers = await prisma.supplier.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      supplierCategory: true,
      status: true,
      lastPurchaseAt: true,
      onTimeDeliveryRating: true,
      qualityRating: true,
    },
  });

  // Roll up total spend per supplier from received POs (kobo).
  const spendGroup = await prisma.purchaseOrder.groupBy({
    by: ['supplierId'],
    where: {
      userId: user.id,
      deletedAt: null,
      status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] },
    },
    _sum: { totalKobo: true },
  });
  const spendBy = new Map(spendGroup.map((g) => [g.supplierId, g._sum.totalKobo ?? 0]));

  const rows: SupplierRow[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email,
    category: s.supplierCategory,
    status: s.status,
    totalSpendKobo: spendBy.get(s.id) ?? 0,
    lastPurchaseAt: s.lastPurchaseAt ? s.lastPurchaseAt.toISOString() : null,
    onTimeDeliveryRating: s.onTimeDeliveryRating,
    qualityRating: s.qualityRating,
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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Suppliers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            The businesses you buy from, ranked by spend, reliability and quality.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/suppliers" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Reports
          </Link>
          <Link href="/suppliers/new" className="btn-pill-primary">
            <Plus size={14} />
            New Supplier
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <SuppliersHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <SuppliersChartRow userId={user.id} />

      {/* 2-col: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <SuppliersTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <SuppliersRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
