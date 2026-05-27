'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface SupplierOption {
  id: string;
  name: string;
  number: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  suppliers: SupplierOption[];
}

export function CreatePurchaseOrderDialog({ open, onClose, suppliers }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.number).includes(q),
    );
  }, [suppliers, query]);

  if (!open) return null;

  function handleSelect(id: string) {
    setSelectedId(id);
    const s = suppliers.find((s) => s.id === id);
    if (s) setQuery(s.name);
  }

  async function handleCreate() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedId,
          totalKobo: 0,
          items: [],
        }),
      });
      const data = await res.json();
      if (res.ok && data?.purchaseOrder?.id) {
        router.push(`/purchase-orders/${data.purchaseOrder.id}`);
      }
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  const showList = query.length > 0 || suppliers.length <= 10;

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
            Create purchase order
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
          {/* Supplier label */}
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            Supplier
          </label>

          {/* Search input */}
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

          {/* Supplier list */}
          {showList && (
            <div className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-[13px] text-slate-400">
                  No suppliers found
                </div>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s.id)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-[13px] transition-colors hover:bg-slate-50 ${
                      selectedId === s.id ? 'bg-brand-50 text-brand-700' : 'text-slate-800'
                    }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-slate-400 text-[12px]">#{s.number}</span>
                  </button>
                ))
              )}
            </div>
          )}
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
