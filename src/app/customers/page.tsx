import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { CustomersHeroKpis } from '@/components/customers/CustomersHeroKpis';
import { CustomersChartRow } from '@/components/customers/CustomersChartRow';
import { CustomersTable, type CustomerRow } from '@/components/customers/CustomersTable';
import { CustomersRightRail } from '@/components/customers/CustomersRightRail';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

type SP = { q?: string };

function deriveStatus(c: {
  lastActivityAt: Date;
  totalPaidKobo: number;
  transactionCount: number;
  behaviorTag: string | null;
  activeThresholdMs: number;
}): string {
  const tag = (c.behaviorTag ?? '').toUpperCase();
  if (tag === 'LATE_PAYER' || tag === 'BLOCKED') return 'BLOCKED';
  if (c.transactionCount === 0 && c.totalPaidKobo === 0) return 'PROSPECT';
  if (new Date(c.lastActivityAt).getTime() >= c.activeThresholdMs) return 'ACTIVE';
  return 'INACTIVE';
}

export default async function CustomersPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  if (user.businessType === 'property_manager') {
    const qs = searchParams.q ? `?q=${encodeURIComponent(searchParams.q)}` : '';
    redirect(`/tenants${qs}`);
  }

  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    orderBy: { lastActivityAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      phone: true,
      tags: true,
      notes: true,
      totalPaidKobo: true,
      totalOwedKobo: true,
      transactionCount: true,
      lastActivityAt: true,
      behaviorTag: true,
      createdAt: true,
    },
  });

  const activeThresholdMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const rows: CustomerRow[] = customers.map((c) => {
    const tags = (c.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
    const group = tags[0] ?? '';
    const location = tags[1] ?? '';
    return {
      id: c.id,
      name: c.name,
      phone: displayPhone(c.phone),
      email: null,
      group,
      location,
      dateJoined: c.createdAt.toISOString(),
      totalSalesKobo: c.totalPaidKobo,
      outstandingKobo: c.totalOwedKobo,
      status: deriveStatus({
        lastActivityAt: c.lastActivityAt,
        totalPaidKobo: c.totalPaidKobo,
        transactionCount: c.transactionCount,
        behaviorTag: c.behaviorTag,
        activeThresholdMs,
      }),
    };
  });

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
            Customers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customer relationships and track sales performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/export/customers" download className="btn-pill-ghost">
            <Download size={14} />
            Export
          </a>
          <Link href="/reports" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Reports
          </Link>
          {/* Customers are created implicitly via `upsertCustomer` when
              the first transaction (payment / debt / invoice) lands.
              There's no dedicated "Add Customer" form yet, so this
              button routes to the highest-frequency creator (record
              payment). Label reflects that so users aren't confused
              when they don't see a customer form. */}
          <Link href="/payments/new" className="btn-pill-primary">
            <Plus size={14} />
            Record payment
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <CustomersHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <CustomersChartRow userId={user.id} />

      {/* 2-col: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <CustomersTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <CustomersRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
