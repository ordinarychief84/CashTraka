import Link from 'next/link';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import {
  Users2,
  Factory,
  Activity,
  ToggleLeft,
  FileText,
  CircleDollarSign,
  Headphones,
  ShieldCheck,
  RefreshCw,
  ClipboardList,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await requireAdminSection('dashboard');

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    activeUserCount,
    suspendedCount,
    signupsToday,
    paymentCount,
    ticketCount,
    invoiceCount,
    firsSubmittedToday,
    activeRecurring,
    docAuditLast24h,
    openOrders,
    activeProduction,
    materialsShort,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, isSuspended: false } }),
    prisma.user.count({ where: { isSuspended: true } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.payment.count(),
    prisma.supportTicket.count({ where: { status: 'open' } }).catch(() => 0),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { firsSubmittedAt: { gte: todayStart } } }),
    prisma.recurringInvoiceRule.count({ where: { status: 'ACTIVE' } }),
    prisma.documentAuditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.customerOrder
      .count({ where: { deletedAt: null, status: { in: ['NEW', 'CONFIRMED'] } } })
      .catch(() => 0),
    prisma.productionOrder
      .count({ where: { deletedAt: null, status: 'IN_PRODUCTION' } })
      .catch(() => 0),
    prisma.productionOrder
      .count({ where: { deletedAt: null, status: 'MATERIALS_NEEDED' } })
      .catch(() => 0),
  ]);

  return (
    <AdminShell adminName={admin.name} activePath="/admin/dashboard" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Control center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {admin.name}
          {!admin.isSuperAdmin && (
            <span className="ml-2 inline-block rounded-full bg-success-100 px-2 py-0.5 text-xs font-semibold text-success-800">
              {admin.adminRole.replace(/_/g, ' ')}
            </span>
          )}
        </p>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Tenants
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active users" value={activeUserCount} accent="good" />
          <Stat label="Signups today" value={signupsToday} accent={signupsToday > 0 ? 'good' : undefined} />
          <Stat label="Suspended" value={suspendedCount} accent={suspendedCount > 0 ? 'warn' : undefined} />
          <Stat label="Open tickets" value={ticketCount} accent={ticketCount > 0 ? 'warn' : undefined} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Operations across all tenants
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Open customer orders" value={openOrders} />
          <Stat label="Production in progress" value={activeProduction} />
          <Stat label="Production awaiting materials" value={materialsShort} accent={materialsShort > 0 ? 'warn' : undefined} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Money + compliance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total payments" value={paymentCount} />
          <Stat label="Total invoices" value={invoiceCount} />
          <Stat label="FIRS submitted today" value={firsSubmittedToday} />
          <Stat label="Active recurring rules" value={activeRecurring} />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Doc audit events in the last 24h: <strong>{docAuditLast24h.toLocaleString()}</strong>.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Quick links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/admin/users" icon={Users2} label="Users" desc="List, suspend, impersonate" />
          <QuickLink href="/admin/ops" icon={Factory} label="Ops records" desc="Orders, production, materials" />
          <QuickLink href="/admin/health" icon={Activity} label="System health" desc="DB, webhooks, failures" />
          <QuickLink href="/admin/feature-flags" icon={ToggleLeft} label="Feature flags" desc="Public signup, modules" />
          <QuickLink href="/admin/support" icon={Headphones} label="Support" desc="Ticket queue" />
          <QuickLink href="/admin/refunds" icon={RefreshCw} label="Refunds" desc="Refund queue" />
          <QuickLink href="/admin/subscriptions" icon={CircleDollarSign} label="Subscriptions" desc="Plan + billing overrides" />
          <QuickLink href="/admin/invoices" icon={FileText} label="Invoices" desc="Cross-tenant search" />
          <QuickLink href="/admin/firs" icon={ShieldCheck} label="FIRS" desc="Submission status" />
          <QuickLink href="/admin/recurring-invoices" icon={RefreshCw} label="Recurring" desc="Recurring rules" />
          <QuickLink href="/admin/document-audit" icon={ClipboardList} label="Doc audit" desc="Filter / export" />
          <QuickLink href="/admin/notifications" icon={Bell} label="Notifications" desc="Broadcast platform-wide" />
        </div>
      </section>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'good' | 'warn' | 'bad';
}) {
  const color =
    accent === 'good'
      ? 'border-success-300 text-success-700'
      : accent === 'warn'
        ? 'border-amber-300 text-amber-700'
        : accent === 'bad'
          ? 'border-red-300 text-red-700'
          : 'border-border text-slate-900';
  return (
    <div className={`rounded-xl border-2 bg-white p-5 shadow-sm ${color.includes('border') ? color.split(' ')[0] : ''}`}>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${color.includes('text') ? color.split(' ')[1] : 'text-slate-900'}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-ink">{label}</div>
        <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
      </div>
    </Link>
  );
}
