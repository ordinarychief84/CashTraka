import Link from 'next/link';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guardWithFeature } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ReportsHeroKpis } from '@/components/reports/ReportsHeroKpis';
import { ReportsChartRow } from '@/components/reports/ReportsChartRow';
import { ReportsTable, type ReportRow } from '@/components/reports/ReportsTable';
import { ReportsRightRail } from '@/components/reports/ReportsRightRail';

export const dynamic = 'force-dynamic';

function periodLabel(start: Date, end: Date): string {
  return `${start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default async function ReportsPage() {
  const user = await guardWithFeature('reports');

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const today = new Date(now);
  today.setHours(23, 59, 59, 999);
  const period = periodLabel(weekStart, today);

  const [
    salesAgg,
    expenseAgg,
    purchasesAgg,
    productionAgg,
    customerCount,
    supplierCount,
    invoicesTotal,
    invoicesPaid,
    outstandingRows,
    productStockRows,
    materialStockRows,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { userId: user.id, status: 'PAID', createdAt: { gte: weekStart } },
      _sum: { amountKobo: true },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { userId: user.id, kind: 'business', incurredOn: { gte: weekStart } },
      _sum: { amountKobo: true },
      _count: { _all: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        userId: user.id,
        deletedAt: null,
        status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] },
        receivedAt: { gte: weekStart },
      },
      _sum: { totalKobo: true },
      _count: { _all: true },
    }),
    prisma.productionOrder.aggregate({
      where: {
        userId: user.id,
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: weekStart },
      },
      _count: { _all: true },
      _sum: { quantityAccepted: true },
    }),
    prisma.customer.count({ where: { userId: user.id } }),
    prisma.supplier.count({ where: { userId: user.id, deletedAt: null } }),
    prisma.invoice.aggregate({
      where: {
        userId: user.id,
        status: {
          in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
        },
        createdAt: { gte: weekStart },
      },
      _sum: { totalKobo: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: weekStart },
      },
      _sum: { totalKobo: true },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: {
        userId: user.id,
        status: {
          in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      select: { totalKobo: true, amountPaidKobo: true },
    }),
    prisma.product.findMany({
      where: { userId: user.id, archived: false },
      select: { stock: true, costKobo: true, priceKobo: true },
    }),
    prisma.rawMaterial.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { stock: true, unitCostKobo: true },
    }),
  ]);

  const salesRevenueKobo = salesAgg._sum.amountKobo ?? 0;
  const expensesKobo = expenseAgg._sum.amountKobo ?? 0;
  const purchasesKobo = purchasesAgg._sum.totalKobo ?? 0;
  const stockValueKobo =
    productStockRows.reduce(
      (s, p) => s + p.stock * (p.costKobo ?? p.priceKobo ?? 0),
      0,
    ) + materialStockRows.reduce((s, m) => s + m.stock * m.unitCostKobo, 0);
  const outstandingKobo = outstandingRows.reduce(
    (s, i) => s + Math.max(0, i.totalKobo - i.amountPaidKobo),
    0,
  );
  const productionUnits = productionAgg._sum.quantityAccepted ?? 0;

  const rows: ReportRow[] = [
    {
      key: 'sales',
      category: 'sales',
      label: 'Sales Summary',
      sublabel: 'sales',
      period,
      totalRevenueKobo: salesRevenueKobo,
      totalCostKobo: 0,
      grossProfitKobo: salesRevenueKobo,
      transactions: salesAgg._count._all,
      status: salesAgg._count._all > 0 ? 'GENERATED' : 'PENDING',
      exportHref: '/api/export/payments',
    },
    {
      key: 'purchases',
      category: 'purchases',
      label: 'Purchase Summary',
      sublabel: 'purchases',
      period,
      totalRevenueKobo: 0,
      totalCostKobo: purchasesKobo,
      grossProfitKobo: -purchasesKobo,
      transactions: purchasesAgg._count._all,
      status: purchasesAgg._count._all > 0 ? 'GENERATED' : 'PENDING',
      exportHref: '/api/export/expenses',
    },
    {
      key: 'inventory',
      category: 'inventory',
      label: 'Inventory Summary',
      sublabel: 'inventory',
      period: today.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      totalRevenueKobo: null,
      totalCostKobo: null,
      grossProfitKobo: null,
      transactions: productStockRows.length + materialStockRows.length,
      status: 'GENERATED',
      exportHref: '/api/export/customers',
    },
    {
      key: 'production',
      category: 'production',
      label: 'Production Summary',
      sublabel: 'production',
      period,
      totalRevenueKobo: null,
      totalCostKobo: 0,
      grossProfitKobo: null,
      transactions: productionAgg._count._all,
      status: productionAgg._count._all > 0 ? 'GENERATED' : 'PENDING',
      exportHref: '/api/export/payments',
    },
    {
      key: 'customers',
      category: 'customers',
      label: 'Customer Summary',
      sublabel: 'customers',
      period,
      totalRevenueKobo: salesRevenueKobo,
      totalCostKobo: 0,
      grossProfitKobo: salesRevenueKobo,
      transactions: customerCount,
      status: customerCount > 0 ? 'GENERATED' : 'PENDING',
      exportHref: '/api/export/customers',
    },
    {
      key: 'suppliers',
      category: 'suppliers',
      label: 'Supplier Summary',
      sublabel: 'suppliers',
      period,
      totalRevenueKobo: 0,
      totalCostKobo: purchasesKobo,
      grossProfitKobo: -purchasesKobo,
      transactions: supplierCount,
      status: supplierCount > 0 ? 'GENERATED' : 'PENDING',
      exportHref: '/api/export/expenses',
    },
    {
      key: 'payments',
      category: 'payments',
      label: 'Payment Summary',
      sublabel: 'invoices & receipts',
      period,
      totalRevenueKobo: invoicesTotal._sum.totalKobo ?? 0,
      totalCostKobo: expensesKobo,
      grossProfitKobo: (invoicesPaid._sum.totalKobo ?? 0) - expensesKobo,
      transactions: invoicesTotal._count._all,
      status: invoicesTotal._count._all > 0 ? 'GENERATED' : 'PENDING',
      exportHref: '/api/export/payments',
    },
    {
      key: 'aging',
      category: 'aging',
      label: 'Aging Report',
      sublabel: 'receivables & payables',
      period: today.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      totalRevenueKobo: null,
      totalCostKobo: null,
      grossProfitKobo: null,
      transactions: outstandingRows.length,
      status: outstandingRows.length > 0 ? 'PENDING' : 'GENERATED',
      exportHref: '/api/export/debts',
    },
  ];

  // Drive a hidden "stock value" through to keep KPI strip consistent with comp.
  void stockValueKobo;

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
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze your business performance with real-time reports and insights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/reports" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </Link>
          <Link href="/reports/operations" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Operations
          </Link>
          <Link href="/reports/margins" className="btn-pill-primary">
            <Plus size={14} />
            New Report
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <ReportsHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <ReportsChartRow userId={user.id} />

      {/* 2-col: reports table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ReportsTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <ReportsRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
