import Link from 'next/link';
import { ClipboardList, Search } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SP = {
  entityType?: string;
  action?: string;
  userId?: string;
  since?: string;
};

const ENTITY_OPTIONS = [
  'INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DELIVERY_NOTE',
  'OFFER', 'ORDER_CONFIRMATION', 'RECURRING_RULE',
];

const ACTION_OPTIONS = [
  'CREATED', 'UPDATED', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID',
  'CANCELLED', 'CREDITED', 'REMINDER_SENT', 'REMINDER_FAILED',
  'XML_GENERATED', 'FIRS_SUBMITTED', 'FIRS_ACCEPTED', 'FIRS_REJECTED',
  'CONVERTED', 'RECURRING_GENERATED', 'PUBLIC_PAYMENT_INIT',
];

const ENTITY_TO_ADMIN_PATH: Record<string, (id: string) => string> = {
  INVOICE: (id) => `/admin/invoices/${id}`,
};

export default async function AdminDocumentAuditPage({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdminSection('docAudit');

  const where: Record<string, unknown> = {};
  if (searchParams.entityType && searchParams.entityType !== 'all' && ENTITY_OPTIONS.includes(searchParams.entityType)) {
    where.entityType = searchParams.entityType;
  }
  if (searchParams.action && ACTION_OPTIONS.includes(searchParams.action)) {
    where.action = searchParams.action;
  }
  if (searchParams.userId) where.userId = searchParams.userId;
  if (searchParams.since) {
    const dt = new Date(searchParams.since);
    if (!Number.isNaN(dt.getTime())) where.createdAt = { gte: dt };
  }

  const [rows, total, topTenantsRaw] = await Promise.all([
    prisma.documentAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true, businessName: true } } },
    }),
    prisma.documentAuditLog.count({ where }),
    prisma.documentAuditLog.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 20,
    }),
  ]);

  const tenantUserIds = topTenantsRaw.map((t) => t.userId);
  const tenants = tenantUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: tenantUserIds } },
        select: { id: true, name: true, businessName: true },
      })
    : [];
  const tenantsById = new Map(tenants.map((u) => [u.id, u]));

  return (
    <AdminShell adminName={admin.name} activePath="/admin/document-audit" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">Document Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">Per-document trail across all tenants ({total.toLocaleString()} entries match)</p>
      </div>

      <form className="mb-4 rounded-xl border border-border bg-white p-3" action="/admin/document-audit" method="get">
        <div className="grid gap-2 md:grid-cols-[auto_auto_auto_auto_auto]">
          <select name="entityType" defaultValue={searchParams.entityType ?? ''} className="input md:w-44">
            <option value="">All entities</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e}>{e.replace('_', ' ')}</option>
            ))}
          </select>
          <select name="action" defaultValue={searchParams.action ?? ''} className="input md:w-44">
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a.replace('_', ' ')}</option>
            ))}
          </select>
          <select name="userId" defaultValue={searchParams.userId ?? ''} className="input md:w-48">
            <option value="">All tenants</option>
            {topTenantsRaw.map((t) => {
              const u = tenantsById.get(t.userId);
              const label = u?.businessName || u?.name || t.userId.slice(0, 8);
              return <option key={t.userId} value={t.userId}>{label} ({t._count.userId})</option>;
            })}
          </select>
          <input
            type="date"
            name="since"
            defaultValue={searchParams.since ?? ''}
            className="input md:w-44"
          />
          <button type="submit" className="btn-primary whitespace-nowrap"><Search size={14} /> Filter</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50/80">
            <tr>
              <Th>When</Th>
              <Th>Tenant</Th>
              <Th>Entity</Th>
              <Th>Action</Th>
              <Th>Actor</Th>
              <Th>Metadata</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">No audit entries found</p>
              </td></tr>
            )}
            {rows.map((r) => {
              const adminPath = ENTITY_TO_ADMIN_PATH[r.entityType]?.(r.entityId);
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-ink">{r.user.name}</div>
                    <div className="text-xs text-slate-500">{r.user.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-[10px] font-bold uppercase text-slate-500">{r.entityType.replace('_', ' ')}</div>
                    {adminPath ? (
                      <Link href={adminPath} className="text-xs font-mono text-brand-600 hover:underline">
                        {r.entityId.slice(0, 12)}…
                      </Link>
                    ) : (
                      <span className="text-xs font-mono text-slate-500">{r.entityId.slice(0, 12)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {r.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">
                    {r.actorId ? r.actorId.slice(0, 12) + '…' : <span className="text-slate-400">system</span>}
                  </td>
                  <td className="px-4 py-2.5 max-w-md">
                    {r.metadata ? (
                      <span className="inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                        {r.metadata.slice(0, 120)}{r.metadata.length > 120 ? '…' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500', className)}>
      {children}
    </th>
  );
}
