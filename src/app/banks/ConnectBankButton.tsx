'use client';

import { useState } from 'react';
import { Landmark, Loader2, X } from 'lucide-react';

/**
 * "Connect a bank" CTA. Calls /api/banks/connect to fetch the Mono Connect
 * widget config. While the integration is in stub mode, the API returns
 * "not configured" and we render a clear placeholder dialog explaining
 * what needs to land for the real widget. When MONO_PUBLIC_KEY is set
 * and the real adapter ships, this is the extension point that loads
 * the Mono Connect script.
 */
export function ConnectBankButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  async function onConnect() {
    setLoading(true);
    setMessage(null);
    setPublicKey(null);
    try {
      const res = await fetch('/api/banks/connect', { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { ok?: boolean; publicKey?: string; error?: string };
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? 'Could not start the linking flow.');
      } else if (json.data?.ok && json.data.publicKey) {
        setPublicKey(json.data.publicKey);
        // Extension point: when MONO_PUBLIC_KEY is set in env and the
        // real adapter is wired, replace the line above with code that
        // dynamically loads the Mono Connect script and opens the
        // widget using `publicKey` + a generated reference.
      } else {
        setMessage(
          json.data?.error ??
            'Mono integration is not configured yet. When MONO_PUBLIC_KEY is set, the Connect widget loads here.',
        );
      }
      setOpen(true);
    } catch {
      setMessage('Network error. Try again.');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onConnect}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
        Connect a bank
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Connect a bank"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 backdrop-blur-[2px] sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Connect a bank</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            {publicKey ? (
              <p className="text-sm text-slate-600">
                Mono Connect public key resolved. The widget mount point goes here.
                Wire the real Mono Connect script to this dialog when the partnership
                lands.
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                {message ??
                  'Mono integration is not configured yet. When MONO_PUBLIC_KEY is set, the Connect widget loads here.'}
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
