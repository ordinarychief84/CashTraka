import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await requireAdminSection('dashboard');

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    userCount,
    paymentCount,
    ticketCount,
    invoiceCount,
    firsSubmittedToday,
    activeRecurring,
    docAuditLast24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.payment.count(),
    prisma.supportTicket.count({ where: { status: 'open' } }).catch(() => 0),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { firsSubmittedAt: { gte: todayStart } } }),
    prisma.recurringInvoiceRule.count({ where: { status: 'ACTIVE' } }),
    prisma.documentAuditLog.count({ where: { createdAt: { gte: dayAgo } } }),
  ]);

  return (
    <AdminShell adminName={admin.name} activePath="/admin/dashboard" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {admin.name}
          {!admin.isSuperAdmin && (
            <span className="ml-2 inline-block rounded-full bg-success-100 px-2 py-0.5 text-xs font-semibold text-success-800">
              {admin.adminRole.replace(/_/g, ' ')}
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Users" value={userCount} />
        <StatCard label="Total Payments" value={paymentCount} />
        <StatCard label="Open Tickets" value={ticketCount} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Invoices" value={invoiceCount} />
        <StatCard label="FIRS submitted today" value={firsSubmittedToday} />
        <StatCard label="Active recurring rules" value={activeRecurring} />
        <StatCard label="Doc audit (last 24h)" value={docAuditLast24h} />
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
