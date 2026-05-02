import Link from 'next/link';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminFirsPage() {
  const admin = await requireAdminSection('firs');

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    submittedToday,
    acceptedToday,
    rejectedToday,
    pendingCount,
    retryingCount,
    stuckCount,
    topErrors,
    stuck,
    topUsersRaw,
  ] = await Promise.all([
    prisma.invoice.count({ where: { firsSubmittedAt: { gte: dayStart } } }),
    prisma.invoice.count({ where: { firsAcceptedAt: { gte: dayStart } } }),
    prisma.invoice.count({ where: { firsStatus: 'REJECTED', firsSubmittedAt: { gte: dayStart } } }),
    prisma.invoice.count({ where: { firsStatus: 'PENDING' } }),
    prisma.invoice.count({ where: { firsStatus: 'RETRYING' } }),
    prisma.invoice.count({ where: { firsRetryCount: { gte: 3 } } }),
    prisma.invoice.groupBy({
      by: ['firsLastError'],
      where: { firsLastError: { not: null } },
      _count: { firsLastError: true },
      orderBy: { _count: { firsLastError: 'desc' } },
      take: 10,
    }),
    prisma.invoice.findMany({
      where: { firsRetryCount: { gte: 3 } },
      orderBy: { firsRetryCount: 'desc' },
      take: 10,
      select: {
        id: true, invoiceNumber: true, firsLastError: true,
        firsRetryCount: true, firsSubmittedAt: true, firsStatus: true,
        user: { select: { id: true, name: true, businessName: true, email: true } },
      },
    }),
    prisma.invoice.groupBy({
      by: ['userId'],
      where: { firsSubmittedAt: { gte: month } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    }),
  ]);

  const topUserIds = topUsersRaw.map((u) => u.userId);
  const topUsers = topUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, name: true, businessName: true, email: true },
      })
    : [];
  const userById = new Map(topUsers.map((u) => [u.id, u]));

  return (
    <AdminShell adminName={admin.name} activePath="/admin/firs" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">FIRS / Electronic Invoicing</h1>
        <p className="mt-1 text-sm text-slate-500">Submission status across the platform</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={ShieldCheck} label="Submitted today" value={submittedToday} color="brand" />
        <StatCard icon={CheckCircle2} label="Accepted today" value={acceptedToday} color="success" />
        <StatCard icon={XCircle} label="Rejected today" value={rejectedToday} color="danger" />
        <StatCard icon={Clock} label="Pending" value={pendingCount} />
        <StatCard icon={RefreshCw} label="Retrying" value={retryingCount} color="brand" />
        <StatCard icon={AlertTriangle} label="Stuck (≥3 retries)" value={stuckCount} color="danger" />
      </div>

      <section className="mb-6 rounded-xl border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-ink">Top 10 errors</h2>
        </header>
        {topErrors.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No errors reported</p>
        ) : (
          <ul className="divide-y divide-border">
            {topErrors.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0 text-sm">
                  <div className="text-red-700">{e.firsLastError}</div>
                </div>
                <div className="shrink-0 num text-sm font-bold text-slate-700">×{e._count.firsLastError}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-ink">Top 10 stuck invoices</h2>
        </header>
        {stuck.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No stuck invoices</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-slate-50/80">
              <tr>
                <Th>Invoice #</Th>
                <Th>Tenant</Th>
                <Th>Last error</Th>
                <Th className="text-right">Retries</Th>
                <Th>Submitted</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stuck.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-ink">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-ink">{inv.user.businessName || inv.user.name}</div>
                    <div className="text-xs text-slate-500">{inv.user.email}</div>
                  </td>
                  <td className="px-4 py-2.5 max-w-md text-xs text-red-700">
                    {inv.firsLastError?.slice(0, 100) || <span className="text-slate-400">--</span>}
                    {(inv.firsLastError?.length ?? 0) > 100 ? '…' : ''}
                  </td>
                  <td className="px-4 py-2.5 text-right num font-semibold text-red-700">{inv.firsRetryCount}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {inv.firsSubmittedAt ? formatDateTime(inv.firsSubmittedAt) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-ink">Top 5 tenants by submissions (last 30d)</h2>
        </header>
        {topUsersRaw.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No submissions in the last 30 days</p>
        ) : (
          <ul className="divide-y divide-border">
            {topUsersRaw.map((u) => {
              const usr = userById.get(u.userId);
              return (
                <li key={u.userId} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <Link href={`/admin/users/${u.userId}`} className="font-semibold text-ink hover:text-brand-600">
                      {usr?.businessName || usr?.name || u.userId.slice(0, 8)}
                    </Link>
                    <div className="text-xs text-slate-500">{usr?.email}</div>
                  </div>
                  <div className="num text-sm font-bold text-brand-700">{u._count.userId} submissions</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  color?: 'success' | 'danger' | 'brand';
}) {
  const colors = { success: 'bg-success-50 text-success-700', danger: 'bg-red-50 text-red-700', brand: 'bg-brand-50 text-brand-700' };
  const iconColor = color ? colors[color] : 'bg-slate-100 text-slate-600';
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className={cn('mb-2 inline-flex rounded-lg p-1.5', iconColor)}><Icon size={16} /></div>
      <div className="text-xl font-black text-ink">{value.toLocaleString()}</div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500', className)}>
      {children}
    </th>
  );
}
