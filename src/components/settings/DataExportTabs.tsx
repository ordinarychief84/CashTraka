'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

type Tab = 'customers' | 'suppliers' | 'inventory' | 'defaults';

const TABS: { id: Tab; label: string }[] = [
  { id: 'customers', label: 'Customers' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'defaults',  label: 'Defaults' },
];

interface Button {
  type: string;
  label: string;
}

const BUTTONS: Record<Tab, Button[]> = {
  customers: [
    { type: 'customers',          label: 'Export customers' },
    { type: 'customer-groups',    label: 'Export customer groups' },
    { type: 'customer-contacts',  label: 'Export customer contacts' },
  ],
  suppliers: [
    { type: 'suppliers',         label: 'Export suppliers' },
    { type: 'supplier-groups',   label: 'Export supplier groups' },
  ],
  inventory: [
    { type: 'inventory',           label: 'Export inventory' },
    { type: 'inventory-movements', label: 'Export inventory movements' },
  ],
  defaults: [
    { type: 'defaults', label: 'Export defaults snapshot' },
  ],
};

export function DataExportTabs() {
  const [tab, setTab] = useState<Tab>('customers');
  const [busy, setBusy] = useState<string | null>(null);

  async function download(type: string) {
    setBusy(type);
    try {
      // Server returns the CSV with a Content-Disposition header so
      // the browser handles the file dialog natively. We open it in
      // the same tab via a hidden anchor to avoid popup blockers.
      const a = document.createElement('a');
      a.href = `/api/settings/data-export/${type}`;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      // Brief artificial delay so the button reads as "exporting" —
      // server-side generation is synchronous and usually <100ms,
      // which is too fast to feel like an action happened.
      setTimeout(() => setBusy(null), 800);
    }
  }

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-5 flex gap-1 border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
              tab === t.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Export buttons for the active tab */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap gap-3">
          {BUTTONS[tab].map((b) => (
            <button
              key={b.type}
              type="button"
              disabled={busy === b.type}
              onClick={() => download(b.type)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy === b.type ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {b.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-400">
          Exports stream as UTF-8 CSV. Numbers are stored in kobo internally and
          converted to Naira (or your active default currency) at export time.
        </p>
      </div>
    </div>
  );
}
