import Link from 'next/link';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { InvoicesHeroKpis } from '@/components/invoices/InvoicesHeroKpis';
import { InvoicesChartRow } from '@/components/invoices/InvoicesChartRow';
import { InvoicesTable, type InvoiceRow } from '@/components/invoices/InvoicesTable';
import { InvoicesRightRail } from '@/components/invoices/InvoicesRightRail';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const user = await guard();

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      customerName: true,
      totalKobo: true,
      amountPaidKobo: true,
      issuedAt: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
    },
  });

  const rows: InvoiceRow[] = invoices.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    customerName: i.customerName,
    status: i.status,
    totalKobo: i.totalKobo,
    amountPaidKobo: i.amountPaidKobo,
    issuedAt: i.issuedAt.toISOString(),
    dueDate: i.dueDate ? i.dueDate.toISOString() : null,
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
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
            Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate, send, chase and collect — one view of your receivables.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invoices" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Reports
          </Link>
          <Link href="/invoices/new" className="btn-pill-primary">
            <Plus size={14} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* 7 KPI tiles */}
      <InvoicesHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <InvoicesChartRow userId={user.id} />

      {/* 2-col: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <InvoicesTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <InvoicesRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
