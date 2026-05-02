'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Receipt } from 'lucide-react';

type Settings = {
  defaultCurrency: string;
  invoicePrefix: string;
  creditNotePrefix: string;
  offerPrefix: string;
  deliveryNotePrefix: string;
  orderPrefix: string;
  taxEnabled: boolean;
  paymentInstructions: string;
  invoiceAccentColor: string;
  invoiceTemplate: 'CLASSIC' | 'MODERN' | 'MINIMAL';
};

/**
 * Invoice + document settings. Lives under /settings?tab=invoice. Drives
 * /api/settings/invoice for both read and patch.
 */
export function InvoiceTab() {
  const [state, setState] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/invoice')
      .then((r) => r.json())
      .then((j) => setState(j.data))
      .catch(() => setMessage('Could not load invoice settings.'));
  }, []);

  async function save() {
    if (!state) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/invoice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      const j = await res.json();
      setMessage(res.ok ? 'Saved.' : j.error || 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Receipt size={16} className="text-brand-600" />
        <h2 className="text-base font-semibold text-slate-900">Invoice settings</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Default currency">
          <input
            type="text"
            maxLength={3}
            className="ct-input"
            value={state.defaultCurrency}
            onChange={(e) =>
              setState({ ...state, defaultCurrency: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Accent color">
          <input
            type="color"
            className="h-10 w-full rounded-md border border-border"
            value={state.invoiceAccentColor}
            onChange={(e) => setState({ ...state, invoiceAccentColor: e.target.value })}
          />
        </Field>
        <Field label="Invoice prefix">
          <input
            type="text"
            className="ct-input"
            value={state.invoicePrefix}
            onChange={(e) =>
              setState({ ...state, invoicePrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Credit note prefix">
          <input
            type="text"
            className="ct-input"
            value={state.creditNotePrefix}
            onChange={(e) =>
              setState({ ...state, creditNotePrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Offer prefix">
          <input
            type="text"
            className="ct-input"
            value={state.offerPrefix}
            onChange={(e) =>
              setState({ ...state, offerPrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Delivery note prefix">
          <input
            type="text"
            className="ct-input"
            value={state.deliveryNotePrefix}
            onChange={(e) =>
              setState({
                ...state,
                deliveryNotePrefix: e.target.value.toUpperCase(),
              })
            }
          />
        </Field>
        <Field label="Order prefix">
          <input
            type="text"
            className="ct-input"
            value={state.orderPrefix}
            onChange={(e) =>
              setState({ ...state, orderPrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Template">
          <select
            className="ct-input"
            value={state.invoiceTemplate}
            onChange={(e) =>
              setState({
                ...state,
                invoiceTemplate: e.target.value as Settings['invoiceTemplate'],
              })
            }
          >
            <option value="CLASSIC">Classic</option>
            <option value="MODERN">Modern</option>
            <option value="MINIMAL">Minimal</option>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={state.taxEnabled}
          onChange={(e) => setState({ ...state, taxEnabled: e.target.checked })}
        />
        Apply VAT (7.5%) by default on new invoices
      </label>

      <Field label="Payment instructions (shown on public invoice page)">
        <textarea
          className="ct-input min-h-[100px]"
          value={state.paymentInstructions}
          onChange={(e) =>
            setState({ ...state, paymentInstructions: e.target.value })
          }
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save settings
        </button>
        {message ? <span className="text-xs text-slate-600">{message}</span> : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
