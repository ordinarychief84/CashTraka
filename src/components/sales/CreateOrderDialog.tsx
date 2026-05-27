'use client';

import { useState, useMemo } from 'react';
import { X, Mail, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type CustomerOption } from './CreateOfferDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
}

const VISIBLE_LIMIT = 10;

export function CreateOrderDialog({ open, onClose, customers }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.number).includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [customers, query]);

  const visible = showAll || query ? filtered : filtered.slice(0, VISIBLE_LIMIT);
  const hasMore = !query && !showAll && customers.length > VISIBLE_LIMIT;

  if (!open) return null;

  function handleSelect(id: string) {
    setSelectedId(id);
    const c = customers.find((c) => c.id === id);
    if (c) setQuery(c.name);
  }

  async function handleCreate() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const c = customers.find((c) => c.id === selectedId);
      const res = await fetch('/api/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedId,
          customerName: c?.name ?? '',
          totalKobo: 0,
          status: 'CONFIRMED',
          items: [],
        }),
      });
      const json = await res.json();
      const orderId = json?.data?.id ?? json?.id;
      if (res.ok && orderId) {
        router.push(`/orders/${orderId}`);
      }
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-semibold text-slate-900">Create order</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-5 pb-2">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            Customer
          </label>

          {/* Search input */}
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId('');
              setShowAll(false);
            }}
            placeholder=""
            className="h-9 w-full rounded-md border border-brand-400 px-3 text-[13px] text-slate-800 outline-none ring-1 ring-brand-300"
          />

          {/* Show more results — appears right below input when list is truncated */}
          {hasMore && (
            <div className="mt-1 mb-0.5">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-[12px] text-brand-600 hover:underline"
              >
                Show more results
              </button>
            </div>
          )}

          {/* Customer list */}
          <div className="mt-1 rounded-md border border-slate-200 bg-white overflow-hidden max-h-72 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-slate-400">No customers found</div>
            ) : (
              visible.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className={`w-full px-4 py-2 text-left transition-colors hover:bg-slate-50 border-b border-slate-100 last:border-0 ${
                    selectedId === c.id ? 'bg-brand-50' : ''
                  }`}
                >
                  {/* Row 1: name + number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] font-medium ${
                        selectedId === c.id ? 'text-brand-700' : 'text-slate-800'
                      }`}
                    >
                      {c.name}
                    </span>
                    <span className="text-[12px] text-slate-400">#{c.number}</span>
                  </div>
                  {/* Row 2: email icon + email + copy */}
                  <div className="mt-0.5 flex items-center gap-1">
                    <Mail size={10} className="shrink-0 text-slate-400" />
                    <span className="text-[11px] text-slate-400">
                      {c.email ?? 'mail@mail.com'}
                    </span>
                    <Copy size={9} className="ml-1 shrink-0 text-slate-300" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer — Create button full-width at bottom */}
        <div className="px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!selectedId || submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
