'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Heart } from 'lucide-react';

type Settings = {
  autoSendFeedback: boolean;
  feedbackAfterReceipt: boolean;
  feedbackAfterPayment: boolean;
  feedbackAfterInvoicePaid: boolean;
  feedbackLinkExpiryDays: number | null;
  feedbackMessageTemplate: string;
};

type LimitsSnapshot = {
  plan: string;
  limits: {
    serviceCheck?: boolean;
    [k: string]: unknown;
  };
};

/**
 * Service Check settings tab. Lives under /settings?tab=feedback. Drives
 * /api/settings/feedback for both read and patch, plus /api/me/limits to
 * decide whether to show the upgrade hint.
 */
export function FeedbackTab() {
  const [state, setState] = useState<Settings | null>(null);
  const [limits, setLimits] = useState<LimitsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/feedback').then((r) => r.json()),
      fetch('/api/me/limits').then((r) => r.json()),
    ])
      .then(([settings, limitsRes]) => {
        setState(settings.data);
        setLimits(limitsRes.data ?? null);
      })
      .catch(() => setMessage('Could not load Service Check settings.'));
  }, []);

  async function save() {
    if (!state) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/feedback', {
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

  const allowed = limits?.limits.serviceCheck === true;

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Heart size={16} className="text-brand-600" />
        <h2 className="text-base font-semibold text-slate-900">Service Check</h2>
      </div>

      {!allowed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Service Check is part of paid plans. You can still view feedback you
          collected before. To send new links,{' '}
          <a
            href="/settings?upgrade=starter_quarterly"
            className="font-semibold text-brand-600 hover:underline"
          >
            upgrade to Starter
          </a>
          .
        </div>
      ) : null}

      <Toggle
        label="Auto-send feedback links"
        help="Master switch. When off, links are only sent when you click the button manually."
        checked={state.autoSendFeedback}
        onChange={(v) => setState({ ...state, autoSendFeedback: v })}
      />

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">When to send</h3>
        <Toggle
          label="After a receipt is generated"
          checked={state.feedbackAfterReceipt}
          disabled={!state.autoSendFeedback}
          onChange={(v) => setState({ ...state, feedbackAfterReceipt: v })}
        />
        <Toggle
          label="After a payment is confirmed"
          checked={state.feedbackAfterPayment}
          disabled={!state.autoSendFeedback}
          onChange={(v) => setState({ ...state, feedbackAfterPayment: v })}
        />
        <Toggle
          label="After an invoice is fully paid"
          checked={state.feedbackAfterInvoicePaid}
          disabled={!state.autoSendFeedback}
          onChange={(v) => setState({ ...state, feedbackAfterInvoicePaid: v })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
        <Field
          label="Link expires after (days)"
          help="Leave empty to never expire."
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            className="input"
            value={state.feedbackLinkExpiryDays ?? ''}
            onChange={(e) =>
              setState({
                ...state,
                feedbackLinkExpiryDays:
                  e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </Field>
      </div>

      <Field
        label="WhatsApp message template"
        help="Use {name} and {url} placeholders. Leave empty for the default."
      >
        <textarea
          className="input min-h-[100px]"
          maxLength={500}
          placeholder="Hi {name}, thank you for your business. Please rate your experience: {url}"
          value={state.feedbackMessageTemplate}
          onChange={(e) =>
            setState({ ...state, feedbackMessageTemplate: e.target.value })
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

function Toggle({
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label
        className={
          'flex items-center gap-2 text-sm ' +
          (disabled ? 'text-slate-400' : 'text-slate-700')
        }
      >
        <input
          type="checkbox"
          checked={checked && !disabled}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {help ? <p className="pl-6 text-xs text-slate-500">{help}</p> : null}
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
