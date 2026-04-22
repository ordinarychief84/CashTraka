'use client';

import { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  Download,
  Calendar,
  Mail,
  ChevronDown,
  Check,
  Loader2,
  CreditCard,
  FileText,
  ShoppingBag,
  Users,
  Receipt,
  Building2,
  Home,
  Wallet,
} from 'lucide-react';

type Props = { businessType?: string };

type ExportKind =
  | 'payments'
  | 'debts'
  | 'sales'
  | 'customers'
  | 'expenses'
  | 'tenants'
  | 'properties'
  | 'rent-payments';

/* ── Dropdown button matching the reference screenshot ───────────── */
function ExportCSVButton({
  kind,
  dateFrom,
  dateTo,
}: {
  kind: ExportKind;
  dateFrom: string;
  dateTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function downloadUrl() {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const qs = params.toString();
    return `/api/export/${kind}${qs ? '?' + qs : ''}`;
  }

  async function handleEmail() {
    setSending(true);
    setSent(false);
    try {
      const res = await fetch('/api/export/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          ...(dateFrom ? { from: dateFrom } : {}),
          ...(dateTo ? { to: dateTo } : {}),
        }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setOpen(false);
        }, 2000);
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Green "Export CSV ▼" button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
      >
        Export CSV
        <ChevronDown
          size={13}
          className={'transition-transform duration-150 ' + (open ? 'rotate-180' : '')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            onClick={handleEmail}
            disabled={sending}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {sending ? (
              <Loader2 size={15} className="shrink-0 animate-spin text-slate-400" />
            ) : sent ? (
              <Check size={15} className="shrink-0 text-emerald-500" />
            ) : (
              <Mail size={15} className="shrink-0 text-slate-400" />
            )}
            {sent ? 'Sent to your email!' : sending ? 'Sending...' : 'Send CSV to email'}
          </button>
          <a
            href={downloadUrl()}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download size={15} className="shrink-0 text-slate-400" />
            Quick Download
          </a>
        </div>
      )}
    </div>
  );
}

/* ── Row item for each export type ─────────────────────────────── */
function ExportRow({
  icon: Icon,
  label,
  description,
  kind,
  dateFrom,
  dateTo,
  isLast,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  kind: ExportKind;
  dateFrom: string;
  dateTo: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={
        'flex items-center justify-between gap-4 px-6 py-3.5' +
        (isLast ? '' : ' border-b border-slate-100')
      }
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Icon size={15} className="text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
          <p className="text-[11px] text-slate-400 truncate">{description}</p>
        </div>
      </div>
      <ExportCSVButton kind={kind} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export function DangerZoneTab({ businessType }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isPM = businessType === 'property_manager';

  const exportTypes: {
    icon: React.ElementType;
    label: string;
    description: string;
    kind: ExportKind;
    show: boolean;
  }[] = [
    { icon: CreditCard, label: 'Payments', description: 'All recorded payments', kind: 'payments', show: true },
    { icon: FileText, label: 'Debts', description: 'Outstanding and settled debts', kind: 'debts', show: true },
    { icon: ShoppingBag, label: 'Sales', description: 'Receipts and line items', kind: 'sales', show: true },
    { icon: Users, label: 'Customers', description: 'Customer directory', kind: 'customers', show: !isPM },
    { icon: Receipt, label: 'Expenses', description: 'Business expenses by category', kind: 'expenses', show: true },
    { icon: Users, label: 'Tenants', description: 'Tenant details and leases', kind: 'tenants', show: isPM },
    { icon: Building2, label: 'Properties', description: 'Properties and unit counts', kind: 'properties', show: isPM },
    { icon: Wallet, label: 'Rent Payments', description: 'Rent collection history', kind: 'rent-payments', show: isPM },
  ];

  const visibleExports = exportTypes.filter((e) => e.show);

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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Download size={18} className="text-slate-400" />
            Export Your Data
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Download or email your data as CSV files.
          </p>
        </div>

        {/* Date range filter */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-3.5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[130px] max-w-[180px]">
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                From
              </label>
              <div className="relative">
                <Calendar
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs focus:border-brand-400 focus:ring-1 focus:ring-brand-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[130px] max-w-[180px]">
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                To
              </label>
              <div className="relative">
                <Calendar
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs focus:border-brand-400 focus:ring-1 focus:ring-brand-100 focus:outline-none"
                />
              </div>
            </div>
            {(dateFrom || dateTo) ? (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="mb-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 underline"
              >
                Clear
              </button>
            ) : (
              <p className="mb-0.5 text-[11px] text-slate-400">All records</p>
            )}
          </div>
          {(dateFrom || dateTo) && (
            <p className="mt-2 text-[11px] text-brand-600 font-medium">
              Filtering: {dateFrom || 'start'} &rarr; {dateTo || 'present'}
            </p>
          )}
        </div>

        {/* Export rows */}
        <div>
          {visibleExports.map((exp, i) => (
            <ExportRow
              key={exp.kind}
              icon={exp.icon}
              label={exp.label}
              description={exp.description}
              kind={exp.kind}
              dateFrom={dateFrom}
              dateTo={dateTo}
              isLast={i === visibleExports.length - 1}
            />
          ))}
        </div>
      </div>

      {/* ── Delete Account ── */}
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
              {error && <p className="text-sm text-red-700">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                    setError('');
                  }}
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
