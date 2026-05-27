'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Key, Copy, Check, AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  scopes: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface Props {
  initialKeys: ApiKeyRow[];
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'Just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ApiKeysManager({ initialKeys }: Props) {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [pending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Raw-token reveal modal state. Shown EXACTLY ONCE after a key is
  // created and dismissed by the user.
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), environment }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not create API key.');
        return;
      }
      const newKey: ApiKeyRow = {
        ...json.data.apiKey,
        lastUsedAt: null,
        revokedAt: null,
      };
      setKeys([newKey, ...keys]);
      setRevealedToken(json.data.rawToken);
      setName('');
      setShowForm(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message ?? 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? Calls using it will be rejected immediately.')) {
      return;
    }
    const res = await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)),
      );
      startTransition(() => router.refresh());
    }
  }

  function copyToken() {
    if (!revealedToken) return;
    navigator.clipboard.writeText(revealedToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* Action bar */}
      <div className="mb-4 flex items-center justify-end">
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={13} />
            Issue new key
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-800">New API key</p>
            <button
              type="button"
              onClick={() => {
                setName('');
                setError(null);
                setShowForm(false);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zapier sync, Internal CRM bot, …"
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Human-readable label so you can identify this key in the list later.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as 'live' | 'test')}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              >
                <option value="live">Live (ct_live_…)</option>
                <option value="test">Test (ct_test_…)</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Generate key
            </button>
            <button
              type="button"
              onClick={() => {
                setName('');
                setError(null);
                setShowForm(false);
              }}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reveal-once modal */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setRevealedToken(null)}
          />
          <div className="relative z-10 mx-3 w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-50 text-success-700">
                <Key size={14} />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-900">Your new API key</h3>
            </div>

            <div className="px-5 py-4">
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-owed-300 bg-owed-50 px-3 py-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-owed-700" />
                <p className="text-[12px] text-owed-900">
                  Copy this token now — it won't be shown again. If you lose it,
                  issue a new one.
                </p>
              </div>

              <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-300 bg-slate-50">
                <code className="flex-1 select-all break-all px-3 py-2 font-mono text-[12px] text-slate-800">
                  {revealedToken}
                </code>
                <button
                  type="button"
                  onClick={copyToken}
                  className="flex shrink-0 items-center gap-1 border-l border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-success-700" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setRevealedToken(null)}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                I've saved it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {keys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Key size={16} />
            </div>
            <p className="text-[13px] text-slate-500">
              No API keys yet. Issue one to connect CashTraka to your own scripts,
              dashboards or integrations.
            </p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Token</th>
                <th className="px-4 py-2.5">Last used</th>
                <th className="px-4 py-2.5">Created</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((k) => (
                <tr key={k.id} className={k.revokedAt ? 'opacity-60' : 'hover:bg-slate-50/60'}>
                  <td className="px-4 py-3 font-medium text-slate-800">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-600">
                    {k.prefix}_…{k.lastFour}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{relativeTime(k.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{relativeTime(k.createdAt)}</td>
                  <td className="px-4 py-3">
                    {k.revokedAt ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Revoked
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revokedAt && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(k.id)}
                        title="Revoke key"
                        disabled={pending}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
