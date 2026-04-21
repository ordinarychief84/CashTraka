import {
  FileText,
  Copy,
  Send,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  Link2,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';
import { formatNaira, formatDate, timeAgo } from '@/lib/format';
import { PromiseActions } from '@/components/promises/PromiseActions';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Link2, label: 'Open' },
  PARTIALLY_PAID: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, label: 'Partial' },
  PROMISED: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Clock, label: 'Promised' },
  PAID: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle, label: 'Paid' },
  BROKEN: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle, label: 'Broken' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-500', icon: XCircle, label: 'Cancelled' },
  EXPIRED: { bg: 'bg-slate-100', text: 'text-slate-500', icon: XCircle, label: 'Expired' },
};

export default async function PromisesPage() {
  const user = await guard();
  const promises = await promiseToPayService.list(user.id);

  const active = promises.filter((p) => ['OPEN', 'PARTIALLY_PAID', 'PROMISED', 'BROKEN'].includes(p.status));
  const resolved = promises.filter((p) => ['PAID', 'CANCELLED', 'EXPIRED'].includes(p.status));

  const totalRemaining = active.reduce((sum, p) => sum + p.remainingAmount, 0);
  const brokenCount = active.filter((p) => p.status === 'BROKEN').length;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Promise to Pay</h1>
          <p className="text-sm text-slate-500">
            Structured payment commitments with auto-confirmation
          </p>
        </div>
        <a
          href="/promises/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          New Promise
        </a>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{active.length}</p>
          <p className="text-xs text-slate-500">Active</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-owed-700">{formatNaira(totalRemaining)}</p>
          <p className="text-xs text-slate-500">Outstanding</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-red-700">{brokenCount}</p>
          <p className="text-xs text-red-600">Broken</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-green-700">
            {promises.filter((p) => p.status === 'PAID').length}
          </p>
          <p className="text-xs text-green-600">Paid</p>
        </div>
      </div>

      {/* Active promises */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <FileText size={18} className="text-slate-400" />
            Active Promises ({active.length})
          </h2>
        </div>

        {active.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No active promises</p>
            <p className="text-xs text-slate-400 mt-1">Create one to start collecting faster</p>
          </div>
        ) : (
          <div className="divide-y">
            {active.map((promise) => {
              const s = STATUS_STYLES[promise.status] || STATUS_STYLES.OPEN;
              const Icon = s.icon;
              const latestCommitment = promise.commitments[0];
              return (
                <div key={promise.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50">
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                    <Icon size={16} className={s.text} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">
                        {promise.customerNameSnapshot}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {promise.phoneSnapshot}
                      {latestCommitment?.commitmentType === 'PAY_ON_DATE' && latestCommitment.promisedDate && (
                        <> · Promised: {formatDate(latestCommitment.promisedDate)}</>
                      )}
                      {promise.lastActionAt && <> · {timeAgo(promise.lastActionAt)}</>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-slate-900">{formatNaira(promise.remainingAmount)}</p>
                    {promise.originalAmount !== promise.remainingAmount && (
                      <p className="text-[11px] text-slate-400">of {formatNaira(promise.originalAmount)}</p>
                    )}
                  </div>
                  <PromiseActions
                    promise={promise}
                    businessName={user.businessName || user.name}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved promises */}
      {resolved.length > 0 && (
        <div className="mt-6 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-600">
              Resolved ({resolved.length})
            </h2>
          </div>
          <div className="divide-y">
            {resolved.slice(0, 10).map((promise) => {
              const s = STATUS_STYLES[promise.status] || STATUS_STYLES.CANCELLED;
              return (
                <div key={promise.id} className="flex items-center gap-4 px-6 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>
                  <span className="flex-1 text-sm text-slate-600">{promise.customerNameSnapshot}</span>
                  <span className="text-sm font-medium text-slate-800">{formatNaira(promise.originalAmount)}</span>
                  <span className="text-xs text-slate-400">{formatDate(promise.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
