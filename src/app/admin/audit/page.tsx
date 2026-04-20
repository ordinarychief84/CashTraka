import { requireAdminSection } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';
import { ClipboardList, Shield, User, Settings, CreditCard, Bell, Headphones } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  'user.suspend': { label: 'User Suspended', color: 'text-red-600 bg-red-50', icon: User },
  'user.reactivate': { label: 'User Reactivated', color: 'text-success-600 bg-success-50', icon: User },
  'user.promote': { label: 'Promoted to Admin', color: 'text-purple-600 bg-purple-50', icon: Shield },
  'user.demote': { label: 'Demoted from Admin', color: 'text-owed-600 bg-owed-50', icon: Shield },
  'plan.override': { label: 'Plan Override', color: 'text-brand-600 bg-brand-50', icon: CreditCard },
  'refund.approve': { label: 'Refund Approved', color: 'text-success-600 bg-success-50', icon: CreditCard },
  'refund.reject': { label: 'Refund Rejected', color: 'text-red-600 bg-red-50', icon: CreditCard },
  'refund.process': { label: 'Refund Processed', color: 'text-success-600 bg-success-50', icon: CreditCard },
  'ticket.assign': { label: 'Ticket Assigned', color: 'text-brand-600 bg-brand-50', icon: Headphones },
  'ticket.close': { label: 'Ticket Closed', color: 'text-slate-600 bg-slate-50', icon: Headphones },
  'ticket.update': { label: 'Ticket Updated', color: 'text-brand-600 bg-brand-50', icon: Headphones },
  'settings.update': { label: 'Settings Updated', color: 'text-indigo-600 bg-indigo-50', icon: Settings },
  'password.change': { label: 'Password Changed', color: 'text-owed-600 bg-owed-50', icon: Shield },
  'notification.broadcast': { label: 'Notification Sent', color: 'text-brand-600 bg-brand-50', icon: Bell },
};

function getActionInfo(action: string) {
  return ACTION_LABELS[action] || { label: action, color: 'text-slate-600 bg-slate-50', icon: ClipboardList };
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default async function AuditLogPage() {
  const admin = await requireAdminSection('audit');

  const [logs, totalCount, actionCounts] = await Promise.all([
    prisma.auditLog.findMany({
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    }),
  ]);

  return (
    <AdminShell adminName={admin.name} activePath="/admin/audit" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500">Complete history of all admin actions on the platform</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-xs text-slate-500">Total Actions</p>
        </div>
        {actionCounts.slice(0, 3).map((ac) => {
          const info = getActionInfo(ac.action);
          return (
            <div key={ac.action} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{ac._count.action}</p>
              <p className="text-xs text-slate-500">{info.label}</p>
            </div>
          );
        })}
      </div>

      {/* Log Table */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <ClipboardList size={18} className="text-slate-400" />
            Recent Actions ({logs.length} of {totalCount})
          </h2>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No audit log entries yet. Actions will appear here as admins use the platform.
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => {
              const info = getActionInfo(log.action);
              const Icon = info.icon;
              let details: Record<string, string> = {};
              try {
                if (log.details) details = JSON.parse(log.details);
              } catch {}

              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${info.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.color}`}>
                        {info.label}
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(log.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-medium">{log.admin.name}</span>
                      {log.targetId && (
                        <span className="text-slate-500"> · Target: {log.targetId.slice(0, 8)}…</span>
                      )}
                    </p>
                    {Object.keys(details).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {Object.entries(details).map(([key, value]) => (
                          <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                            {key}: {String(value).slice(0, 50)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-slate-400">
                      {log.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {log.createdAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
