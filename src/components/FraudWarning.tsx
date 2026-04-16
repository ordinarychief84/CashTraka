'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Flag } from 'lucide-react';
import { ReportFraudDialog } from './ReportFraudDialog';

type Props = {
  phone: string;
  customerName: string;
};

type Stats = {
  reports: number;
  youReported: boolean;
  reasons: { reason: string; createdAt: string }[];
};

/**
 * Appears on the customer detail page. Shows whether this phone has been
 * reported by any CashTraka seller, and lets the current seller add/remove
 * their own report.
 */
export function FraudWarning({ phone, customerName }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/fraud-reports?phone=${encodeURIComponent(phone)}`);
    if (res.ok) setStats(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  async function unreport() {
    if (!confirm('Remove your fraud report for this number?')) return;
    setLoading(true);
    try {
      await fetch(`/api/fraud-reports?phone=${encodeURIComponent(phone)}`, {
        method: 'DELETE',
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  if (!stats) return null;

  const othersCount = stats.reports - (stats.youReported ? 1 : 0);

  return (
    <>
      {stats.reports > 0 ? (
        <div className="rounded-xl border border-owed-500/60 bg-owed-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-owed-600" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-owed-700">
                ⚠️ This number has been reported for fraud
              </div>
              <div className="mt-1 text-xs text-owed-700/90">
                {stats.youReported && othersCount === 0 && 'Reported by you.'}
                {stats.youReported && othersCount > 0 && (
                  <>Reported by you and {othersCount} other seller{othersCount === 1 ? '' : 's'}.</>
                )}
                {!stats.youReported && othersCount > 0 && (
                  <>Reported by {othersCount} seller{othersCount === 1 ? '' : 's'} on CashTraka.</>
                )}
              </div>
              {stats.reasons.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-owed-700/80">
                  {stats.reasons.slice(0, 3).map((r, i) => (
                    <li key={i}>• {r.reason}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.youReported ? (
                  <button
                    type="button"
                    onClick={unreport}
                    disabled={loading}
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Remove your report
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="rounded-md bg-owed-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-owed-600"
                  >
                    <Flag size={13} className="mr-1 inline" />
                    Add your report
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-owed-600"
          >
            <Flag size={13} />
            Report this number for fraud
          </button>
        </div>
      )}

      <ReportFraudDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        phone={phone}
        customerName={customerName}
        onReported={load}
      />
    </>
  );
}
