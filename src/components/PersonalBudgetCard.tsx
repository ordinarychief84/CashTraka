'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Wallet, Save } from 'lucide-react';
import { formatNaira } from '@/lib/format';

/**
 * Settings-page card for configuring personal-expense spending thresholds.
 *
 * Weekly and monthly are independent — set either, both, or neither.
 * Leaving a field empty (or zero) disables that specific alert. The
 * thresholds are surfaced as a red banner on /expenses whenever the
 * current-period spend crosses the configured amount.
 */
type Props = {
  initial: {
    weekly: number | null;
    monthly: number | null;
  };
};

export function PersonalBudgetCard({ initial }: Props) {
  const router = useRouter();
  const [weekly, setWeekly] = useState(initial.weekly?.toString() ?? '');
  const [monthly, setMonthly] = useState(initial.monthly?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/settings/personal-budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalBudgetWeekly: weekly.trim() ? Number(weekly) : null,
          personalBudgetMonthly: monthly.trim() ? Number(monthly) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not save');
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="personal-budget" className="card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <User size={14} />
        Personal spending budget
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Set how much you want to spend out-of-pocket each week or month.
        We&apos;ll flash a warning on the Expenses page whenever you cross
        the line, so you notice before the damage is done. Leave blank to
        disable.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">
            <Wallet size={12} className="mr-1 inline" />
            Weekly budget (₦)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="input num"
            placeholder="e.g. 15000"
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
          />
          {initial.weekly !== null && (
            <p className="mt-1 text-[11px] text-slate-500">
              Currently {formatNaira(initial.weekly)}
            </p>
          )}
        </label>
        <label className="block">
          <span className="label">
            <Wallet size={12} className="mr-1 inline" />
            Monthly budget (₦)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="input num"
            placeholder="e.g. 60000"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
          />
          {initial.monthly !== null && (
            <p className="mt-1 text-[11px] text-slate-500">
              Currently {formatNaira(initial.monthly)}
            </p>
          )}
        </label>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Saved. Budget alerts are now live.
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary"
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save budget'}
        </button>
      </div>
    </div>
  );
}
