'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, Loader2, RefreshCw, Trash2 } from 'lucide-react';

type Account = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: string;
  lastSyncAt: string | null;
  errorMessage: string | null;
};

/**
 * Renders the seller's linked bank accounts with Sync + Disconnect
 * actions. Both actions call the API and refresh the route afterwards
 * so the page picks up the new state.
 */
export function LinkedAccountsList({ accounts }: { accounts: Account[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <ul className="divide-y divide-slate-100">
        {accounts.map((a) => (
          <AccountRow key={a.id} account={a} />
        ))}
      </ul>
    </div>
  );
}

function AccountRow({ account }: { account: Account }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'sync' | 'disconnect' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSync() {
    setBusy('sync');
    setError(null);
    try {
      const res = await fetch(`/api/banks/${account.id}/sync`, { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Sync failed.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect() {
    if (!confirm('Disconnect this bank account? Past transactions stay on file.')) return;
    setBusy('disconnect');
    setError(null);
    try {
      const res = await fetch(`/api/banks/${account.id}`, { method: 'DELETE' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Could not disconnect.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(null);
    }
  }

  const last = account.lastSyncAt
    ? new Date(account.lastSyncAt).toLocaleString('en-NG')
    : 'Never';

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Landmark size={16} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{account.bankName}</div>
          <div className="truncate font-mono text-xs text-slate-500">
            {account.accountNumber} &middot; {account.accountName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span
              className={
                'inline-flex rounded-full px-2 py-0.5 font-semibold ' +
                (account.status === 'ACTIVE'
                  ? 'bg-success-50 text-success-700'
                  : account.status === 'ERROR'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600')
              }
            >
              {account.status}
            </span>
            <span>Last sync: {last}</span>
          </div>
          {account.errorMessage ? (
            <div className="mt-1 text-xs text-red-600">{account.errorMessage}</div>
          ) : null}
          {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <button
          type="button"
          onClick={onSync}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500 disabled:opacity-60"
        >
          {busy === 'sync' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Sync
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {busy === 'disconnect' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
          Disconnect
        </button>
      </div>
    </li>
  );
}
