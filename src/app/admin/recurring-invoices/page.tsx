import { RefreshCw, Play, Pause, X, AlertTriangle, CalendarClock } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminRecurringActions } from '@/components/admin/AdminRecurringActions';
import { prisma } from '@/lib/prisma';
import { formatDate, formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminRecurringInvoicesPage() {
  const admin = await requireAdminSection('recurring');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [
    rules,
    activeCount,
    pausedCount,
    cancelledCount,
    failedCount,
    dueTodayCount,
  ] = await Promise.all([
    prisma.recurringInvoiceRule.findMany({
      orderBy: [
        { lastRunError: { sort: 'desc', nulls: 'last' } },
        { nextRunAt: 'asc' },
      ],
      take: 200,
      include: {
        user: { select: { id: true, name: true, businessName: true, email: true } },
      },
    }),
    prisma.recurringInvoiceRule.count({ where: { status: 'ACTIVE' } }),
    prisma.recurringInvoiceRule.count({ where: { status: 'PAUSED' } }),
    prisma.recurringInvoiceRule.count({ where: { status: 'CANCELLED' } }),
    prisma.recurringInvoiceRule.count({ where: { lastRunError: { not: null } } }),
    prisma.recurringInvoiceRule.count({ where: { status: 'ACTIVE', nextRunAt: { lte: tomorrow } } }),
  ]);

  // Hydrate customer name from templateData JSON.
  const enriched = rules.map((r) => {
    let customerName: string | null = null;
    try {
      const tpl = JSON.parse(r.templateData) as { customerName?: string };
      customerName = tpl?.customerName ?? null;
    } catch {
      // Older / malformed templateData — show fallback.
    }
    return { ...r, customerName };
  });

  return (
    <AdminShell adminName={admin.name} activePath="/admin/recurring-invoices" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">Recurring Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">All recurring invoice rules across tenants</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard icon={Play} label="Active" value={activeCount} color="success" />
        <StatCard icon={Pause} label="Paused" value={pausedCount} />
        <StatCard icon={X} label="Cancelled" value={cancelledCount} />
        <StatCard icon={AlertTriangle} label="Failed" value={failedCount} color="danger" />
        <StatCard icon={CalendarClock} label="Due in 24h" value={dueTodayCount} color="brand" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50/80">
            <tr>
              <Th>Frequency</Th>
              <Th>Tenant</Th>
              <Th>Customer</Th>
              <Th>Next run</Th>
              <Th className="text-right">Runs</Th>
              <Th>Last error</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enriched.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <RefreshCw size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">No recurring rules</p>
              </td></tr>
            )}
            {enriched.map((r) => (
              <tr key={r.id} className={cn('hover:bg-slate-50', r.lastRunError && 'bg-red-50/30')}>
                <td className="px-4 py-3 text-xs font-bold uppercase text-slate-700">{r.frequency}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{r.user.businessName || r.user.name}</div>
                  <div className="text-xs text-slate-500">{r.user.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.customerName || <span className="text-slate-400">--</span>}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {formatDateTime(r.nextRunAt)}
                  <div className="text-[10px] text-slate-400">{timeAgo(r.nextRunAt)}</div>
                </td>
                <td className="px-4 py-3 text-right num">{r.runsCompleted}</td>
                <td className="px-4 py-3 max-w-xs">
                  {r.lastRunError ? (
                    <span className="text-xs text-red-700">{r.lastRunError.slice(0, 80)}{r.lastRunError.length > 80 ? '…' : ''}</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                  {r.lastRunAt && <div className="text-[10px] text-slate-400">last {formatDate(r.lastRunAt)}</div>}
                </td>
                <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  <AdminRecurringActions ruleId={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <div className="text-xl font-black text-ink">{value}</div>
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-success-50 text-success-700',
    PAUSED: 'bg-amber-50 text-amber-700',
    CANCELLED: 'bg-slate-200 text-slate-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', map[status] || 'bg-slate-100 text-slate-600')}>
      {status}
    </span>
  );
}
