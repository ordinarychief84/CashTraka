import Link from 'next/link';
import { redirect } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { CustomersRackbeatTable, type CustomerRackbeatRow } from '@/components/sales/CustomersRackbeatTable';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

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

export default async function CustomersPage() {
  const user = await guard();

  if (user.businessType === 'property_manager') {
    redirect('/tenants');
  }

  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    orderBy: { lastActivityAt: 'desc' },
    take: 500,
    select: {
      id: true,
      name: true,
      phone: true,
      totalPaidKobo: true,
      totalOwedKobo: true,
      transactionCount: true,
      lastActivityAt: true,
      behaviorTag: true,
      createdAt: true,
    },
  });

  const activeThresholdMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const rows: CustomerRackbeatRow[] = customers.map((c, i) => ({
    id: c.id,
    number: 1001 + i,
    name: c.name,
    vatNo: null,
    email: null,
    status: deriveStatus({
      lastActivityAt: c.lastActivityAt,
      totalPaidKobo: c.totalPaidKobo,
      transactionCount: c.transactionCount,
      behaviorTag: c.behaviorTag,
      activeThresholdMs,
    }),
  }));

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

        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Customers
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
                href="/customers/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create new
              </Link>
            </div>
          </div>

          <CustomersRackbeatTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
