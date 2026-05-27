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

export function CreateCustomerInvoiceDialog({ open, onClose, customers }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.number).includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [customers, query]);

  if (!open) return null;

  function handleSelect(id: string) {
    setSelectedId(id);
    const c = customers.find((c) => c.id === id);
    if (c) setQuery(c.name);
  }

  function handleCreate() {
    if (!selectedId) return;
    setSubmitting(true);
    // Invoices need a phone + line items for FIRS compliance, so we can't
    // create a zero-line stub like we do for offers/orders/POs. Navigate
    // to the full invoice form with the chosen customer pre-selected.
    const c = customers.find((c) => c.id === selectedId);
    const params = new URLSearchParams({
      customerId: selectedId,
      customerName: c?.name ?? '',
    });
    router.push(`/invoices/new?${params.toString()}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-semibold text-slate-900">
            Create customer invoice
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            Customer
          </label>

          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId('');
            }}
            placeholder=""
            className="h-9 w-full rounded-md border border-brand-400 px-3 text-[13px] text-slate-800 outline-none ring-1 ring-brand-300"
          />

          <div className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-slate-400">
                No customers found
              </div>
            ) : (
              <>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-slate-50 ${
                      selectedId === c.id ? 'bg-brand-50' : ''
                    }`}
                  >
                    <span
                      className={`font-medium flex-1 text-left ${
                        selectedId === c.id ? 'text-brand-700' : 'text-slate-800'
                      }`}
                    >
                      {c.name}
                    </span>
                    {c.email && (
                      <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Mail size={10} />
                        {c.email}
                      </span>
                    )}
                    <span className="text-slate-400 text-[12px] shrink-0">
                      #{c.number}
                    </span>
                    <Copy size={10} className="text-slate-300 shrink-0" />
                  </button>
                ))}
                {customers.length > filtered.length && (
                  <div className="px-4 py-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="text-[12px] text-brand-600 hover:underline"
                    >
                      Show more results
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 pb-5">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!selectedId || submitting}
            className="rounded-lg bg-brand-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
