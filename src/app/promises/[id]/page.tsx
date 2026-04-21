import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Calendar,
  FileText,
  Copy,
  Send,
  Shield,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';
import { formatNaira, formatDate, formatDateTime, timeAgo } from '@/lib/format';
import { CopyLinkButton } from '@/components/promises/CopyLinkButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PromiseDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();
  const promise = await promiseToPayService.getById(params.id, user.id);

  const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-blue-50 text-blue-700',
    PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
    PROMISED: 'bg-purple-50 text-purple-700',
    PAID: 'bg-green-50 text-green-700',
    BROKEN: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
    EXPIRED: 'bg-slate-100 text-slate-500',
  };

  const PAYMENT_STATUS: Record<string, { bg: string; text: string }> = {
    SUCCESS: { bg: 'bg-green-50', text: 'text-green-700' },
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700' },
  };

  const totalPaid = promise.payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-6">
        <Link href="/promises" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mb-3">
          <ArrowLeft size={14} /> Back to Promises
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{promise.customerNameSnapshot}</h1>
            <p className="text-sm text-slate-500">{promise.phoneSnapshot}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[promise.status] || ''}`}>
            {promise.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount summary */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatNaira(promise.originalAmount)}</p>
                <p className="text-xs text-slate-500">Original</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{formatNaira(totalPaid)}</p>
                <p className="text-xs text-slate-500">Paid</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-owed-700">{formatNaira(promise.remainingAmount)}</p>
                <p className="text-xs text-slate-500">Remaining</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(100, (totalPaid / promise.originalAmount) * 100)}%` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Timeline</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Created */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <FileText size={14} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-700">Promise created</p>
                  <p className="text-xs text-slate-400">{formatDateTime(promise.createdAt)}</p>
                </div>
              </div>

              {/* Commitments */}
              {promise.commitments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50">
                    {c.commitmentType === 'PAY_ON_DATE' ? (
                      <Calendar size={14} className="text-purple-600" />
                    ) : (
                      <CreditCard size={14} className="text-purple-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">
                      {c.commitmentType === 'PAY_NOW' && 'Customer chose to pay now'}
                      {c.commitmentType === 'PAY_PART' && `Customer chose to pay ${formatNaira(c.committedAmount || 0)}`}
                      {c.commitmentType === 'PAY_ON_DATE' && `Customer promised to pay on ${formatDate(c.promisedDate)}`}
                    </p>
                    {c.message && <p className="text-xs text-slate-500 mt-0.5">"{c.message}"</p>}
                    <p className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</p>
                  </div>
                </div>
              ))}

              {/* Payments */}
              {promise.payments.map((p) => {
                const ps = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.PENDING;
                return (
                  <div key={p.id} className="flex gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ps.bg}`}>
                      {p.status === 'SUCCESS' ? (
                        <CheckCircle size={14} className={ps.text} />
                      ) : p.status === 'FAILED' ? (
                        <AlertTriangle size={14} className={ps.text} />
                      ) : (
                        <Clock size={14} className={ps.text} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">
                        {formatNaira(p.amount)} — {p.status.toLowerCase()}
                        {p.provider && <span className="text-slate-400"> via {p.provider.toLowerCase()}</span>}
                      </p>
                      {p.verifiedAt && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Shield size={10} /> Verified at {formatDateTime(p.verifiedAt)}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">{formatDateTime(p.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Actions</h3>
            <CopyLinkButton url={promise.publicUrl || `/promise/${promise.publicToken}`} />
            <a
              href={`https://wa.me/${promise.phoneSnapshot}?text=${encodeURIComponent(`Hi ${promise.customerNameSnapshot}, here is your payment link: ${promise.publicUrl || ''}`)}`}
              target="_blank"
              className="flex w-full items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Send size={14} /> Send via WhatsApp
            </a>
          </div>

          {/* Details */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-700">{formatDate(promise.createdAt)}</dd>
              </div>
              {promise.lastActionAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last action</dt>
                  <dd className="text-slate-700">{timeAgo(promise.lastActionAt)}</dd>
                </div>
              )}
              {promise.note && (
                <div>
                  <dt className="text-slate-500 mb-1">Note</dt>
                  <dd className="text-slate-700 bg-slate-50 rounded p-2 text-xs">{promise.note}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

