'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  CircleDollarSign,
  Settings2,
  ShieldAlert,
  History,
} from 'lucide-react';
import type { Limits } from '@/lib/plan-limits';

type Props = {
  userId: string;
  currentPlan: string;
  baseLimits: Limits;
  effectiveLimits: Limits;
  overrideMap: Record<string, boolean | number | null>;
  discountKobo: number | null;
  auditEntries: Array<{
    id: string;
    action: string;
    createdAt: string;
    details: string | null;
    admin: { name: string | null };
  }>;
};

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'starter_quarterly', label: 'Starter (Quarterly)' },
  { value: 'starter_biannually', label: 'Starter (Biannual)' },
  { value: 'starter_yearly', label: 'Starter (Yearly)' },
  { value: 'business', label: 'Business (legacy)' },
  { value: 'business_plus', label: 'Business Plus (legacy)' },
  { value: 'landlord', label: 'Landlord (legacy)' },
  { value: 'estate_manager', label: 'Estate Manager (legacy)' },
];

const BOOLEAN_FLAGS: Array<{ key: keyof Limits; label: string }> = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'creditNotes', label: 'Credit notes' },
  { key: 'recurringInvoices', label: 'Recurring invoices' },
  { key: 'firsCompliance', label: 'FIRS compliance' },
  { key: 'electronicXml', label: 'Electronic XML' },
  { key: 'deliveryNotes', label: 'Delivery notes' },
  { key: 'offers', label: 'Offers / quotes' },
  { key: 'paystackPay', label: 'Paystack pay button' },
  { key: 'paymentReminders', label: 'Payment reminders' },
  { key: 'serviceCheck', label: 'Service Check' },
  { key: 'customBranding', label: 'Custom branding' },
  { key: 'prioritySupport', label: 'Priority support' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payroll', label: 'Payroll' },
];

const NUMERIC_FLAGS: Array<{ key: keyof Limits; label: string }> = [
  { key: 'paymentsPerMonth', label: 'Payments per month' },
  { key: 'activeDebts', label: 'Active debts' },
  { key: 'customers', label: 'Customers' },
  { key: 'templates', label: 'Message templates' },
  { key: 'properties', label: 'Properties' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'teamMembers', label: 'Team members' },
  { key: 'maxReminderRules', label: 'Reminder rules' },
];

export function SubscriptionPanel(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [plan, setPlan] = useState(props.currentPlan);
  const [activeUntil, setActiveUntil] = useState('');
  const [discount, setDiscount] = useState(
    props.discountKobo === null ? '' : String(props.discountKobo),
  );

  async function call(
    url: string,
    method: string,
    body: unknown,
    label: string,
  ) {
    setBusy(label);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error ?? 'Request failed');
      }
      setOkMsg(label + ' applied.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  function setPlanTier() {
    void call(
      '/api/admin/users/' + props.userId + '/plan',
      'PATCH',
      { plan },
      'Plan',
    );
  }

  function lifecycle(action: string, payload: Record<string, unknown> = {}) {
    void call(
      '/api/admin/users/' + props.userId + '/subscription',
      'POST',
      { action, ...payload },
      action,
    );
  }

  function setBoolFlag(flag: keyof Limits, value: boolean | null) {
    void call(
      '/api/admin/users/' + props.userId + '/overrides',
      'PATCH',
      { flag, value },
      flag + ' override',
    );
  }

  function setNumericFlag(flag: keyof Limits, raw: string) {
    let value: number | null | undefined;
    const trimmed = raw.trim();
    if (trimmed === '') value = undefined; // unset
    else if (trimmed.toLowerCase() === 'unlimited' || trimmed === 'null')
      value = null;
    else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        setError('Enter a non-negative integer or "unlimited"');
        return;
      }
      value = Math.floor(n);
    }
    void call(
      '/api/admin/users/' + props.userId + '/overrides',
      'PATCH',
      { flag, value: value === undefined ? null : value },
      flag + ' quota',
    );
  }

  function saveDiscount() {
    const trimmed = discount.trim();
    let value: number | null;
    if (trimmed === '') value = null;
    else {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        setError('Enter a discount in kobo (negative for credit)');
        return;
      }
      value = Math.floor(n);
    }
    void call(
      '/api/admin/users/' + props.userId + '/overrides',
      'PATCH',
      { discountKobo: value },
      'Discount',
    );
  }

  function clearAll() {
    if (
      !confirm(
        'Remove every override for this user and return them to plan defaults?',
      )
    )
      return;
    void call(
      '/api/admin/users/' + props.userId + '/overrides',
      'PATCH',
      { clear: true },
      'Clear overrides',
    );
  }

  const overrideStateForFlag = useMemo(
    () => (flag: keyof Limits) => {
      if (!(flag in props.overrideMap)) return 'plan';
      const v = props.overrideMap[flag];
      if (v === true) return 'on';
      if (v === false) return 'off';
      return 'plan';
    },
    [props.overrideMap],
  );

  return (
    <section className="card mb-6 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
        <Settings2 size={16} className="text-brand-600" />
        Subscription controls
      </h2>
      <p className="mb-4 text-[11px] text-slate-500">
        Direct controls for plan tier, lifecycle state, per-user feature
        overrides, and billing credit. Every action writes to the audit log.
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          {okMsg}
        </div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Plan tier
          </h3>
          <div className="flex flex-wrap gap-2">
            <select
              className="input flex-1"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              {PLAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary"
              disabled={busy !== null}
              onClick={setPlanTier}
            >
              {busy === 'Plan' ? 'Saving...' : 'Save plan'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            <CalendarClock size={12} /> Subscription lifecycle
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null}
              onClick={() => lifecycle('extend-trial', { days: 7 })}
            >
              Extend trial 7d
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null}
              onClick={() => lifecycle('extend-trial', { days: 14 })}
            >
              Extend trial 14d
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null}
              onClick={() => lifecycle('extend-trial', { days: 30 })}
            >
              Extend trial 30d
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null}
              onClick={() => lifecycle('mark-past-due')}
            >
              Mark past due
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null}
              onClick={() => lifecycle('mark-cancelled')}
            >
              Mark cancelled
            </button>
            <button
              type="button"
              className="btn-secondary text-xs text-red-600"
              disabled={busy !== null}
              onClick={() => lifecycle('restore-free')}
            >
              Restore to free
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="input flex-1"
              value={activeUntil}
              onChange={(e) => setActiveUntil(e.target.value)}
              aria-label="Active until"
            />
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy !== null || !activeUntil}
              onClick={() =>
                lifecycle('set-active', {
                  currentPeriodEnd: new Date(activeUntil).toISOString(),
                })
              }
            >
              Mark active until date
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          <ShieldAlert size={12} /> Feature overrides
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">Effective</th>
                <th className="px-3 py-2 text-right">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {BOOLEAN_FLAGS.map(({ key, label }) => {
                const eff = props.effectiveLimits[key] as boolean;
                const state = overrideStateForFlag(key);
                return (
                  <tr key={String(key)}>
                    <td className="px-3 py-2 font-medium text-ink">{label}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                          (eff
                            ? 'bg-success-50 text-success-700'
                            : 'bg-slate-100 text-slate-600')
                        }
                      >
                        {eff ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Pill
                          active={state === 'plan'}
                          onClick={() => setBoolFlag(key, null)}
                          disabled={busy !== null}
                          label="Plan default"
                        />
                        <Pill
                          active={state === 'on'}
                          onClick={() => setBoolFlag(key, true)}
                          disabled={busy !== null}
                          label="Force on"
                        />
                        <Pill
                          active={state === 'off'}
                          onClick={() => setBoolFlag(key, false)}
                          disabled={busy !== null}
                          label="Force off"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Quota overrides
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Quota</th>
                <th className="px-3 py-2">Plan default</th>
                <th className="px-3 py-2">Effective</th>
                <th className="px-3 py-2 text-right">Custom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {NUMERIC_FLAGS.map(({ key, label }) => (
                <NumericRow
                  key={String(key)}
                  label={label}
                  base={props.baseLimits[key] as number | null}
                  effective={props.effectiveLimits[key] as number | null}
                  overrideValue={
                    key in props.overrideMap
                      ? (props.overrideMap[key] as number | null)
                      : undefined
                  }
                  busy={busy !== null}
                  onSave={(raw) => setNumericFlag(key, raw)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          Use &quot;unlimited&quot; or leave blank to clear the override.
        </div>
      </div>

      <div className="mb-5">
        <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          <CircleDollarSign size={12} /> Billing actions
        </h3>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <input
            className="input"
            placeholder="Discount in kobo (negative = credit)"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={busy !== null}
            onClick={saveDiscount}
          >
            Save discount
          </button>
          <button
            type="button"
            className="btn-secondary text-red-600"
            disabled={busy !== null}
            onClick={clearAll}
          >
            Clear all overrides
          </button>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Applied at next renewal.
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          <History size={12} /> Audit trail (last 20)
        </h3>
        {props.auditEntries.length === 0 ? (
          <p className="text-xs text-slate-500">No audit entries yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-slate-50">
            {props.auditEntries.map((entry) => (
              <li key={entry.id} className="px-3 py-2 text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold text-ink">{entry.action}</span>
                  <span className="text-[10px] text-slate-500">
                    by {entry.admin.name ?? 'Unknown'} on{' '}
                    {new Date(entry.createdAt).toLocaleString('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                {entry.details && (
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] text-slate-600">
                    {entry.details}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Pill({
  active,
  onClick,
  disabled,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ' +
        (active
          ? 'bg-brand-500 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200') +
        ' disabled:opacity-50'
      }
    >
      {label}
    </button>
  );
}

function NumericRow({
  label,
  base,
  effective,
  overrideValue,
  busy,
  onSave,
}: {
  label: string;
  base: number | null;
  effective: number | null;
  overrideValue: number | null | undefined;
  busy: boolean;
  onSave: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(
    overrideValue === undefined
      ? ''
      : overrideValue === null
        ? 'unlimited'
        : String(overrideValue),
  );
  const display = (n: number | null) => (n === null ? 'Unlimited' : String(n));

  return (
    <tr>
      <td className="px-3 py-2 font-medium text-ink">{label}</td>
      <td className="px-3 py-2 text-slate-600">{display(base)}</td>
      <td className="px-3 py-2 text-slate-700">{display(effective)}</td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex gap-1">
          <input
            className="input !py-1 !text-xs"
            style={{ width: 110 }}
            placeholder="plan default"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={label + ' override'}
          />
          <button
            type="button"
            className="rounded-md bg-brand-500 px-2 text-[10px] font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => onSave(draft)}
          >
            Save
          </button>
        </div>
      </td>
    </tr>
  );
}
