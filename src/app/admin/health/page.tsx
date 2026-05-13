import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { timeAgo } from '@/lib/format';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Webhook,
  Bell,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * System health page. Gives the on-call admin a one-look answer to
 * "is the platform alive and well right now?" without needing to log
 * into Vercel / Sentry / Neon separately.
 */
export default async function AdminHealthPage() {
  const admin = await requireAdminSection('health');

  const startedAt = Date.now();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let dbPingMs = -1;
  let dbOk = false;
  try {
    const pingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbPingMs = Date.now() - pingStart;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    deletedUsers,
    signupsToday,
    signupsWeek,
    docAuditDay,
    webhooksDay,
    webhookFailDay,
    notificationsDay,
    activeSubs,
    paidInvoicesDay,
    recentFailedReminders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { deletedAt: null, isSuspended: false } }),
    prisma.user.count({ where: { isSuspended: true } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.documentAuditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.webhookEventLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.webhookEventLog.count({
      where: {
        createdAt: { gte: dayAgo },
        verificationStatus: { in: ['REJECTED', 'FAILED'] },
      },
    }),
    prisma.notification.count({ where: { createdAt: { gte: dayAgo } } }).catch(() => 0),
    prisma.user.count({
      where: { subscriptionStatus: { in: ['active', 'trialing'] } },
    }),
    prisma.invoice.count({
      where: { paidAt: { gte: dayAgo } },
    }).catch(() => 0),
    prisma.documentAuditLog.findMany({
      where: {
        createdAt: { gte: dayAgo },
        action: { in: ['REMINDER_FAILED', 'FIRS_REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { id: true, email: true, businessName: true } } },
    }),
  ]);

  const totalReadMs = Date.now() - startedAt;

  return (
    <AdminShell adminName={admin.name} activePath="/admin/health" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">System health</h1>
        <p className="mt-1 text-sm text-slate-500">
          Snapshot at {new Date().toLocaleString()} — full report read in {totalReadMs}ms.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Health
          icon={Database}
          label="Database"
          status={dbOk ? 'ok' : 'fail'}
          detail={dbOk ? `${dbPingMs}ms ping` : 'Cannot reach DB'}
        />
        <Health
          icon={Webhook}
          label="Webhooks 24h"
          status={webhookFailDay === 0 ? 'ok' : webhookFailDay < 5 ? 'warn' : 'fail'}
          detail={`${webhooksDay} received · ${webhookFailDay} failed`}
        />
        <Health
          icon={Bell}
          label="Notifications 24h"
          status="info"
          detail={`${notificationsDay} sent`}
        />
        <Health
          icon={Activity}
          label="Doc audit 24h"
          status="info"
          detail={`${docAuditDay} events`}
        />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-ink">Tenants</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total users" value={totalUsers} />
          <Stat label="Active" value={activeUsers} good />
          <Stat label="Suspended" value={suspendedUsers} bad={suspendedUsers > 0} />
          <Stat label="Soft-deleted" value={deletedUsers} muted />
          <Stat label="Signups today" value={signupsToday} good={signupsToday > 0} />
          <Stat label="Signups last 7d" value={signupsWeek} />
          <Stat label="Active subscriptions" value={activeSubs} good />
          <Stat label="Invoices paid 24h" value={paidInvoicesDay} good={paidInvoicesDay > 0} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-ink">Recent failures (24h)</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            REMINDER_FAILED + FIRS_REJECTED from the document audit log.
          </p>
        </div>
        {recentFailedReminders.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            <CheckCircle2 size={18} className="mx-auto mb-1 text-success-500" />
            No failures in the last 24 hours.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentFailedReminders.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">
                    <AlertCircle size={12} className="mr-1 inline text-red-500" />
                    {e.action} · {e.entityType}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {e.user?.businessName || e.user?.email || 'unknown tenant'}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">
                  <Clock size={11} className="mr-1 inline" />
                  {timeAgo(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}

function Health({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  status: 'ok' | 'warn' | 'fail' | 'info';
  detail: string;
}) {
  const palette = {
    ok: { border: 'border-success-300', text: 'text-success-700', dot: 'bg-success-500' },
    warn: { border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
    fail: { border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
    info: { border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' },
  }[status];
  return (
    <div className={`rounded-xl border-2 bg-white p-4 ${palette.border}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-slate-500" />
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
        <span className={`text-sm font-bold ${palette.text}`}>{detail}</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  good,
  bad,
  muted,
}: {
  label: string;
  value: number;
  good?: boolean;
  bad?: boolean;
  muted?: boolean;
}) {
  let color = 'text-slate-900';
  if (good) color = 'text-success-700';
  else if (bad) color = 'text-red-700';
  else if (muted) color = 'text-slate-500';
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}
