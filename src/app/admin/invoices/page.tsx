import Link from 'next/link';
import { Search, FileText, AlertTriangle, CheckCircle2, Clock, FilePlus2, ShieldAlert } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { formatNaira, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SP = {
  q?: string;
  status?: string;
  firsStatus?: string;
  userId?: string;
  page?: string;
};

const STATUS_OPTIONS = [
  'DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CREDITED',
];
const FIRS_OPTIONS = ['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'RETRYING', 'FAILED'];

const PAGE_SIZE = 50;

export default async function AdminInvoicesPage({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdminSection('invoices');

  const where: Record<string, unknown> = {};
  if (searchParams.status && STATUS_OPTIONS.includes(searchParams.status)) {
    where.status = searchParams.status;
  }
  if (searchParams.firsStatus) {
    if (searchParams.firsStatus === 'none') where.firsStatus = null;
    else if (FIRS_OPTIONS.includes(searchParams.firsStatus)) where.firsStatus = searchParams.firsStatus;
  }
  if (searchParams.userId) where.userId = searchParams.userId;
  if (searchParams.q?.trim()) {
    const q = searchParams.q.trim();
    where.OR = [{ invoiceNumber: { contains: q } }, { customerName: { contains: q } }];
  }

  const page = Math.max(parseInt(searchParams.page || '1', 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [
    rows,
    total,
    totalCount,
    outstandingAgg,
    paidAgg,
    overdueCount,
    draftCount,
    firsPendingCount,
    topTenants,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        customerName: true,
        total: true,
        amountPaid: true,
        dueDate: true,
        createdAt: true,
        firsStatus: true,
        firsIrn: true,
        firsRetryCount: true,
        user: { select: { id: true, name: true, businessName: true, email: true } },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.count(),
    prisma.invoice.aggregate({
      _sum: { total: true, amountPaid: true },
      where: { status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] } },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: 'PAID' },
    }),
    prisma.invoice.count({ where: { status: 'OVERDUE' } }),
    prisma.invoice.count({ where: { status: 'DRAFT' } }),
    prisma.invoice.count({ where: { firsStatus: 'PENDING' } }),
    prisma.invoice.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 20,
    }),
  ]);

  const tenantUserIds = topTenants.map((t) => t.userId);
  const tenants = tenantUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: tenantUserIds } },
        select: { id: true, name: true, businessName: true, email: true },
      })
    : [];
  const tenantsById = new Map(tenants.map((u) => [u.id, u]));
  const tenantOptions = topTenants.map((t) => ({
    id: t.userId,
    label: tenantsById.get(t.userId)?.businessName || tenantsById.get(t.userId)?.name || t.userId.slice(0, 8),
    count: t._count.userId,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const outstandingTotal = (outstandingAgg._sum.total || 0) - (outstandingAgg._sum.amountPaid || 0);
  const paidTotal = paidAgg._sum.total || 0;

  const baseQuery = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...searchParams, ...extra };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, String(v));
    }
    return params.toString();
  };

  return (
    <AdminShell adminName={admin.name} activePath="/admin/invoices" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">Platform Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">All invoices issued by every tenant on CashTraka</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={FileText} label="Total invoices" value={totalCount.toLocaleString()} />
        <StatCard icon={AlertTriangle} label="Outstanding" value={formatNaira(outstandingTotal)} color="danger" />
        <StatCard icon={CheckCircle2} label="Paid" value={formatNaira(paidTotal)} color="success" />
        <StatCard icon={Clock} label="Overdue" value={overdueCount.toLocaleString()} color="danger" />
        <StatCard icon={FilePlus2} label="Drafts" value={draftCount.toLocaleString()} />
        <StatCard icon={ShieldAlert} label="FIRS pending" value={firsPendingCount.toLocaleString()} color="brand" />
      </div>

      <form className="mb-4 rounded-xl border border-border bg-white p-3" action="/admin/invoices" method="get">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="Search invoice # or customer..."
              className="input !pl-10"
            />
          </div>
          <select name="status" defaultValue={searchParams.status ?? ''} className="input md:w-36">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select name="firsStatus" defaultValue={searchParams.firsStatus ?? ''} className="input md:w-36">
            <option value="">Any FIRS</option>
            <option value="none">No FIRS</option>
            {FIRS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="userId" defaultValue={searchParams.userId ?? ''} className="input md:w-44">
            <option value="">All tenants</option>
            {tenantOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label} ({t.count})</option>
            ))}
          </select>
          <button type="submit" className="btn-primary whitespace-nowrap"><Search size={14} /> Search</button>
        </div>
      </form>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">Showing {rows.length} of {total} invoices</p>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 && (
          <div className="rounded-xl border border-border bg-white px-4 py-8 text-center text-sm text-slate-400">
            No invoices match these filters.
          </div>
        )}
        {rows.map((inv) => {
          const outstanding = inv.total - inv.amountPaid;
          return (
            <Link
              key={inv.id}
              href={`/admin/invoices/${inv.id}`}
              className="block rounded-xl border border-border bg-white p-3 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-ink">{inv.invoiceNumber}</div>
                <StatusPill status={inv.status} />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {inv.user.businessName || inv.user.name} &middot; {inv.customerName}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-bold text-ink">{formatNaira(inv.total)}</span>
                <span className={cn('num font-semibold', outstanding > 0 ? 'text-red-600' : 'text-success-600')}>
                  {outstanding > 0 ? `Owes ${formatNaira(outstanding)}` : 'Settled'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>{formatDate(inv.createdAt)}</span>
                {inv.firsStatus && <FirsPill status={inv.firsStatus} />}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50/80">
            <tr>
              <Th>Invoice #</Th>
              <Th>Tenant</Th>
              <Th>Customer</Th>
              <Th className="text-right">Total</Th>
              <Th className="text-right">Paid</Th>
              <Th className="text-right">Outstanding</Th>
              <Th>Status</Th>
              <Th>FIRS</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-12 text-center">
                <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">No invoices found</p>
              </td></tr>
            )}
            {rows.map((inv) => {
              const outstanding = inv.total - inv.amountPaid;
              return (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-ink">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{inv.user.businessName || inv.user.name}</div>
                    <div className="text-xs text-slate-500">{inv.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{inv.customerName}</td>
                  <td className="px-4 py-3 text-right font-semibold num">{formatNaira(inv.total)}</td>
                  <td className="px-4 py-3 text-right num text-success-700">{formatNaira(inv.amountPaid)}</td>
                  <td className={cn('px-4 py-3 text-right num font-semibold', outstanding > 0 ? 'text-red-600' : 'text-slate-400')}>
                    {formatNaira(outstanding)}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={inv.status} /></td>
                  <td className="px-4 py-3">{inv.firsStatus ? <FirsPill status={inv.firsStatus} /> : <span className="text-slate-400 text-xs">--</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(inv.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
          <div className="text-xs text-slate-500">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/invoices?${baseQuery({ page: String(page - 1) })}`} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Previous</Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/invoices?${baseQuery({ page: String(page + 1) })}`} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Next</Link>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  color?: 'success' | 'danger' | 'brand';
}) {
  const colors = { success: 'bg-success-50 text-success-700', danger: 'bg-red-50 text-red-700', brand: 'bg-brand-50 text-brand-700' };
  const iconColor = color ? colors[color] : 'bg-slate-100 text-slate-600';
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className={cn('mb-2 inline-flex rounded-lg p-1.5', iconColor)}><Icon size={16} /></div>
      <div className="text-lg font-black text-ink">{value}</div>
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
    DRAFT: 'bg-slate-100 text-slate-700',
    SENT: 'bg-brand-50 text-brand-700',
    VIEWED: 'bg-indigo-50 text-indigo-700',
    PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
    PAID: 'bg-success-50 text-success-700',
    OVERDUE: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-slate-200 text-slate-700',
    CREDITED: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', map[status] || 'bg-slate-100 text-slate-600')}>
      {status.replace('_', ' ')}
    </span>
  );
}

function FirsPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-brand-50 text-brand-700',
    ACCEPTED: 'bg-success-50 text-success-700',
    REJECTED: 'bg-red-50 text-red-700',
    RETRYING: 'bg-amber-50 text-amber-700',
    FAILED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', map[status] || 'bg-slate-100 text-slate-600')}>
      {status}
    </span>
  );
}
