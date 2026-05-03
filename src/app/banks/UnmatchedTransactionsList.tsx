'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Search, X } from 'lucide-react';

type Transaction = {
  id: string;
  direction: string;
  amountKobo: number;
  description: string | null;
  reference: string | null;
  occurredAt: string;
};

type InvoiceHit = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
};

function formatKobo(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(naira);
}

/**
 * Renders unmatched bank transactions with a per-row inline picker that
 * searches the seller's invoices and matches one to the transaction.
 */
export function UnmatchedTransactionsList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <ul className="divide-y divide-slate-100">
        {transactions.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            isOpen={openId === t.id}
            onOpen={() => setOpenId(t.id)}
            onClose={() => setOpenId(null)}
          />
        ))}
      </ul>
    </div>
  );
}

function TransactionRow({
  transaction,
  isOpen,
  onOpen,
  onClose,
}: {
  transaction: Transaction;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const isCredit = transaction.direction === 'CREDIT';
  const Icon = isCredit ? ArrowDownCircle : ArrowUpCircle;
  const tone = isCredit ? 'text-success-700' : 'text-slate-500';
  const dateLabel = new Date(transaction.occurredAt).toLocaleString('en-NG');

  return (
    <li className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={'flex h-9 w-9 shrink-0 items-center justify-center ' + tone}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">
              {formatKobo(transaction.amountKobo)}{' '}
              <span className="ml-1 text-[10px] uppercase tracking-wide text-slate-500">
                {transaction.direction}
              </span>
            </div>
            {transaction.description ? (
              <div className="truncate text-xs text-slate-600">
                {transaction.description}
              </div>
            ) : null}
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              <span>{dateLabel}</span>
              {transaction.reference ? (
                <span className="font-mono">Ref {transaction.reference}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="sm:shrink-0">
          {isOpen ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X size={13} />
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              <Search size={13} />
              Match to invoice
            </button>
          )}
        </div>
      </div>

      {isOpen ? <InvoicePicker transactionId={transaction.id} onMatched={onClose} /> : null}
    </li>
  );
}

function InvoicePicker({
  transactionId,
  onMatched,
}: {
  transactionId: string;
  onMatched: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<InvoiceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced search.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const url = q.trim()
          ? `/api/invoices?q=${encodeURIComponent(q.trim())}`
          : '/api/invoices';
        const res = await fetch(url);
        const json = (await res.json().catch(() => ({}))) as { data?: InvoiceHit[] };
        if (cancelled) return;
        setResults(json.data ?? []);
      } catch {
        if (!cancelled) setError('Could not search invoices.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  async function pick(invoiceId: string) {
    setBusyId(invoiceId);
    setError(null);
    try {
      const res = await fetch(`/api/banks/transactions/${transactionId}/match`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Could not match.');
      } else {
        onMatched();
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Search invoices
      </label>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Invoice number or customer name"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}

      <div className="mt-3 max-h-60 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 px-1 py-2 text-xs text-slate-500">
            <Loader2 size={13} className="animate-spin" />
            Searching...
          </div>
        ) : results.length === 0 ? (
          <div className="px-1 py-2 text-xs text-slate-500">No invoices found.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.invoiceNumber}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {r.customerName} &middot; {formatKobo(r.total * 100)} &middot; {r.status}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => pick(r.id)}
                  disabled={busyId !== null}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {busyId === r.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  Match
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
