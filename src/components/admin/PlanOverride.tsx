'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

type Props = {
  userId: string;
  currentPlan: string;
  currentStatus: string;
};

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'business', label: 'Business' },
  { value: 'business_plus', label: 'Business Plus' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'estate_manager', label: 'Estate Manager' },
];

const STATUS_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'trialing', label: 'Trialing' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Admin-only plan override. Sits inside the user detail page.
 *
 * Forcing a plan here bypasses Paystack entirely — use it for manual
 * comps, support cases, or to recover from a stuck billing state. Every
 * action is logged via AdminNote on the server.
 */
export function PlanOverride({ userId, currentPlan, currentStatus }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(currentPlan);
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setOk(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, status, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not update plan');
      }
      setOk(true);
      setReason('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update plan');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm("Reset this user back to Free? This clears any active subscription state.")) return;
    setPlan('free');
    setStatus('free');
    setReason('reset to free');
    // Kick off save immediately — state updates are async but fetch uses
    // explicit payload below.
    setBusy(true);
    setOk(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'free', status: 'free', reason: 'admin reset to free' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not reset plan');
      }
      setOk(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset plan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
        <ShieldAlert size={16} className="text-amber-600" />
        Plan &amp; billing override
      </h2>
      <p className="mb-3 text-[11px] text-slate-500">
        Bypasses Paystack. Use only for comps, support, or stuck billing states.
        Every change is logged.
      </p>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="block">
          <span className="label">Plan</span>
          <select
            className="input"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-2 block">
        <span className="label">Reason (appears in audit log)</span>
        <input
          className="input"
          placeholder="e.g. partner comp, chargeback refund, support case #1234"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      {error && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {ok && (
        <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          Plan updated.
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={save}
        >
          {busy ? 'Saving…' : 'Apply change'}
        </button>
        <button
          type="button"
          className="btn-secondary text-red-600"
          disabled={busy}
          onClick={reset}
        >
          Reset to free
        </button>
      </div>
    </section>
  );
}
