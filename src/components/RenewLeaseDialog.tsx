'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, X } from 'lucide-react';

type Props = {
  tenantId: string;
  tenantName: string;
  currentLeaseEnd?: string | null;
};

export function RenewLeaseDialog({ tenantId, tenantName, currentLeaseEnd }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Default new lease start to day after current lease end, or today
  const defaultStart = currentLeaseEnd
    ? new Date(new Date(currentLeaseEnd).getTime() + 86400000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // Default new lease end to 1 year from start
  const defaultEnd = (() => {
    const d = new Date(defaultStart);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [leaseStart, setLeaseStart] = useState(defaultStart);
  const [leaseEnd, setLeaseEnd] = useState(defaultEnd);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/renew-lease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseStart, leaseEnd }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
        title="Renew lease"
      >
        <RefreshCw size={12} />
        Renew
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Renew Lease</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              Set new lease dates for <strong>{tenantName}</strong>. This clears all
              previous expiry reminders and starts the lifecycle fresh.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-700">New lease start</span>
                <input
                  type="date"
                  value={leaseStart}
                  onChange={(e) => setLeaseStart(e.target.value)}
                  required
                  className="input mt-1"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">New lease end</span>
                <input
                  type="date"
                  value={leaseEnd}
                  onChange={(e) => setLeaseEnd(e.target.value)}
                  required
                  className="input mt-1"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? 'Renewing…' : 'Renew Lease'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
