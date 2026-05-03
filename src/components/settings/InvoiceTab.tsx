'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Receipt } from 'lucide-react';

type ReminderCadence =
  | 'OFF'
  | 'FRIENDLY_3_DAYS'
  | 'FRIENDLY_7_DAYS'
  | 'OVERDUE_DAILY';

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
  // Workflow defaults
  firsAutoSubmit: boolean;
  defaultInvoiceDueDays: number | null;
  defaultPaymentTerms: string;
  invoiceReminderCadence: ReminderCadence;
  autoArchiveDays: number | null;
  recurringAutoSendDefault: boolean;
  xmlGenerateOnFirs: boolean;
  documentRetentionMonths: number;
  platformFeeOptIn: boolean;
};

type LimitsSnapshot = {
  plan: string;
  limits: {
    firsCompliance: boolean;
    [k: string]: unknown;
  };
};

/**
 * Invoice + document settings. Lives under /settings?tab=invoice. Drives
 * /api/settings/invoice for both read and patch, plus /api/me/limits to
 * decide which plan-gated controls to disable.
 */
export function InvoiceTab() {
  const [state, setState] = useState<Settings | null>(null);
  const [limits, setLimits] = useState<LimitsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/invoice').then((r) => r.json()),
      fetch('/api/me/limits').then((r) => r.json()),
    ])
      .then(([settings, limitsRes]) => {
        setState(settings.data);
        setLimits(limitsRes.data ?? null);
      })
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
        <Loader2 size={14} className="animate-spin" /> Loading...
      </div>
    );
  }

  const firsAllowed = limits?.limits.firsCompliance === true;

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
            className="input"
            value={state.defaultCurrency}
            onChange={(e) =>
              setState({ ...state, defaultCurrency: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Accent color">
          <AccentColorPicker
            value={state.invoiceAccentColor}
            onChange={(c) => setState({ ...state, invoiceAccentColor: c })}
          />
        </Field>
        <Field label="Invoice prefix">
          <input
            type="text"
            className="input"
            value={state.invoicePrefix}
            onChange={(e) =>
              setState({ ...state, invoicePrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Credit note prefix">
          <input
            type="text"
            className="input"
            value={state.creditNotePrefix}
            onChange={(e) =>
              setState({ ...state, creditNotePrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Offer prefix">
          <input
            type="text"
            className="input"
            value={state.offerPrefix}
            onChange={(e) =>
              setState({ ...state, offerPrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Delivery note prefix">
          <input
            type="text"
            className="input"
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
            className="input"
            value={state.orderPrefix}
            onChange={(e) =>
              setState({ ...state, orderPrefix: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Template">
          <select
            className="input"
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
          className="input min-h-[100px]"
          value={state.paymentInstructions}
          onChange={(e) =>
            setState({ ...state, paymentInstructions: e.target.value })
          }
        />
      </Field>

      {/* ── Platform fee ──────────────────────────────────────────── */}
      <div className="space-y-2 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Platform fee</h3>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={state.platformFeeOptIn}
            onChange={(e) =>
              setState({ ...state, platformFeeOptIn: e.target.checked })
            }
          />
          <span>
            Add a 1% platform fee to Paystack invoice payments
          </span>
        </label>
        <p className="pl-6 text-xs text-slate-500">
          Capped at &#8358;5,000 per transaction. Tracked on each payment for
          monthly remittance to CashTraka. v1 just records the fee for
          transparency, your customer still pays you directly.
        </p>
      </div>

      {/* ── Workflow defaults ─────────────────────────────────────── */}
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Workflow defaults</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Default due in X days">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              className="input"
              value={state.defaultInvoiceDueDays ?? ''}
              onChange={(e) =>
                setState({
                  ...state,
                  defaultInvoiceDueDays:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </Field>

          <Field label="Default payment terms">
            <input
              type="text"
              className="input"
              maxLength={120}
              placeholder="Net 30"
              value={state.defaultPaymentTerms}
              onChange={(e) =>
                setState({ ...state, defaultPaymentTerms: e.target.value })
              }
            />
          </Field>

          <Field label="Reminder cadence">
            <select
              className="input"
              value={state.invoiceReminderCadence}
              onChange={(e) =>
                setState({
                  ...state,
                  invoiceReminderCadence: e.target.value as ReminderCadence,
                })
              }
            >
              <option value="OFF">Off</option>
              <option value="FRIENDLY_3_DAYS">Every 3 days (gentle)</option>
              <option value="FRIENDLY_7_DAYS">Every 7 days (gentle)</option>
              <option value="OVERDUE_DAILY">Daily after overdue</option>
            </select>
          </Field>

          <Field
            label="Auto-archive PDFs after (days)"
            help="Leave empty to keep forever"
          >
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              className="input"
              value={state.autoArchiveDays ?? ''}
              onChange={(e) =>
                setState({
                  ...state,
                  autoArchiveDays:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </Field>

          <Field
            label="Document retention period (months)"
            help="Recommended 72 months for Nigerian tax records"
          >
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={240}
              className="input"
              value={state.documentRetentionMonths}
              onChange={(e) =>
                setState({
                  ...state,
                  documentRetentionMonths: Number(e.target.value) || 72,
                })
              }
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={state.recurringAutoSendDefault}
            onChange={(e) =>
              setState({ ...state, recurringAutoSendDefault: e.target.checked })
            }
          />
          Auto-send new recurring invoices by default
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={state.xmlGenerateOnFirs}
            onChange={(e) =>
              setState({ ...state, xmlGenerateOnFirs: e.target.checked })
            }
          />
          Auto-generate XML when submitting to FIRS
        </label>

        <div className="space-y-1">
          <label
            className={
              'flex items-center gap-2 text-sm ' +
              (firsAllowed ? 'text-slate-700' : 'text-slate-400')
            }
          >
            <input
              type="checkbox"
              disabled={!firsAllowed}
              checked={firsAllowed && state.firsAutoSubmit}
              onChange={(e) =>
                setState({ ...state, firsAutoSubmit: e.target.checked })
              }
            />
            Auto-submit tax invoices to FIRS on creation
          </label>
          {!firsAllowed ? (
            <p className="pl-6 text-xs text-slate-500">
              Available on Starter plan.{' '}
              <a
                href="/settings?upgrade=starter_quarterly"
                className="font-semibold text-brand-600 hover:underline"
              >
                Upgrade to Starter
              </a>
            </p>
          ) : null}
        </div>
      </div>

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

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
    </label>
  );
}

const SWATCHES = ['#00B8E8', '#0E7C66', '#7C3AED', '#DB2777', '#EA580C', '#0F172A'];

/**
 * Brand-safe swatch picker with a hex fallback. Native <input type="color">
 * is unreliable on Android Chrome, so we ship our own.
 */
function AccentColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const normalized = value?.toLowerCase?.() ?? '';
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SWATCHES.map((c) => {
          const selected = c.toLowerCase() === normalized;
          return (
            <button
              key={c}
              type="button"
              aria-label={`Use accent ${c}`}
              onClick={() => onChange(c)}
              className={
                'h-9 w-9 rounded-md border transition ' +
                (selected
                  ? 'border-slate-900 ring-2 ring-offset-1 ring-slate-900'
                  : 'border-border hover:border-slate-400')
              }
              style={{ background: c }}
            />
          );
        })}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#00B8E8"
        className="input mt-2 font-mono text-xs"
        maxLength={7}
      />
    </div>
  );
}
