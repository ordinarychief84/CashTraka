'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Download, Calendar } from 'lucide-react';

type Props = { businessType?: string };

export function DangerZoneTab({ businessType }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Date range state for exports
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function exportUrl(type: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const qs = params.toString();
    return `/api/export/${type}${qs ? '?' + qs : ''}`;
  }

  const isPM = businessType === 'property_manager';

  async function handleDelete() {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not delete account');
      }
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Export Data ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Download size={18} className="text-slate-400" />
            Export Your Data
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Filter by date range, then download as CSV.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Date range picker */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-xs font-semibold text-slate-600">From</label>
              <div className="relative">
                <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-xs font-semibold text-slate-600">To</label>
              <div className="relative">
                <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline pb-2"
              >
                Clear dates
              </button>
            )}
          </div>

          {!dateFrom && !dateTo && (
            <p className="text-xs text-slate-400">Leave dates empty to export all records.</p>
          )}
          {(dateFrom || dateTo) && (
            <p className="text-xs text-brand-600 font-medium">
              Exporting records {dateFrom ? 'from ' + dateFrom : ''}{dateFrom && dateTo ? ' ' : ''}{dateTo ? 'to ' + dateTo : ''}
            </p>
          )}

          {/* Export buttons */}
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={exportUrl('payments')}
              className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Payments</span>
              <Download size={14} className="text-slate-400" />
            </a>
            <a
              href={exportUrl('debts')}
              className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Debts</span>
              <Download size={14} className="text-slate-400" />
            </a>
            <a
              href={exportUrl('sales')}
              className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Sales</span>
              <Download size={14} className="text-slate-400" />
            </a>
            <a
              href={exportUrl('customers')}
              className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Customers</span>
              <Download size={14} className="text-slate-400" />
            </a>
            <a
              href={exportUrl('expenses')}
              className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Expenses</span>
              <Download size={14} className="text-slate-400" />
            </a>

            {/* Property manager extras */}
            {isPM && (
              <>
                <a
                  href={exportUrl('tenants')}
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>Tenants</span>
                  <Download size={14} className="text-slate-400" />
                </a>
                <a
                  href={exportUrl('properties')}
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>Properties</span>
                  <Download size={14} className="text-slate-400" />
                </a>
                <a
                  href={exportUrl('rent-payments')}
                  className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>Rent Payments</span>
                  <Download size={14} className="text-slate-400" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Account (clearly separated) ── */}
      <div className="rounded-xl border-2 border-red-200 bg-red-50/30 shadow-sm">
        <div className="border-b border-red-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-red-700">
            <AlertTriangle size={18} />
            Delete Account
          </h2>
          <p className="text-sm text-red-600">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
        </div>
        <div className="p-6">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
              Delete my account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800">
                <strong>This will permanently delete:</strong>
                <ul className="mt-2 ml-4 list-disc space-y-1 text-xs">
                  <li>All your customers, payments, and debts</li>
                  <li>All your products, sales, and expenses</li>
                  <li>All your invoices and receipts</li>
                  {isPM && <li>All your properties, tenants, and rent payments</li>}
                  <li>Your account and business profile</li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-semibold text-red-700 mb-1.5">
                  Type <span className="font-mono bg-red-100 px-1 rounded">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-red-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                  placeholder="DELETE"
                />
              </div>
              {error && (
                <p className="text-sm text-red-700">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowConfirm(false); setConfirmText(''); setError(''); }}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {deleting ? 'Deleting...' : 'Permanently delete account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
