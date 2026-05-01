'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

type Props = {
  initial: {
    slug: string;
    catalogEnabled: boolean;
    catalogTagline: string;
    receiptPrefix: string;
    appUrl: string;
  };
};

export function StorefrontTab({ initial }: Props) {
  const [slug, setSlug] = useState(initial.slug);
  const [catalogEnabled, setCatalogEnabled] = useState(initial.catalogEnabled);
  const [tagline, setTagline] = useState(initial.catalogTagline);
  const [prefix, setPrefix] = useState(initial.receiptPrefix);

  const [savingSlug, setSavingSlug] = useState(false);
  const [savingPrefix, setSavingPrefix] = useState(false);
  const [slugMessage, setSlugMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [prefixMessage, setPrefixMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const baseUrl = initial.appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const previewUrl = slug ? `${baseUrl}/store/${slug}` : null;

  async function saveSlug(e: React.FormEvent) {
    e.preventDefault();
    setSavingSlug(true);
    setSlugMessage(null);
    try {
      const res = await fetch('/api/settings/slug', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          catalogTagline: tagline || null,
          catalogEnabled,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSlugMessage({ tone: 'err', text: json.error ?? 'Could not save.' });
      } else {
        setSlugMessage({ tone: 'ok', text: 'Storefront saved.' });
      }
    } catch {
      setSlugMessage({ tone: 'err', text: 'Network error. Try again.' });
    } finally {
      setSavingSlug(false);
    }
  }

  async function savePrefix(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrefix(true);
    setPrefixMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ receiptPrefix: prefix.toUpperCase().trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setPrefixMessage({ tone: 'err', text: j.error ?? 'Could not save.' });
      } else {
        setPrefixMessage({ tone: 'ok', text: 'Receipt prefix saved.' });
      }
    } catch {
      setPrefixMessage({ tone: 'err', text: 'Network error. Try again.' });
    } finally {
      setSavingPrefix(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 text-base font-semibold text-slate-900">Public storefront</div>
        <p className="mb-4 text-sm text-slate-500">
          Pick a slug, and customers can visit your catalog at{' '}
          <span className="font-mono">{baseUrl}/store/&lt;slug&gt;</span>.
        </p>

        <form onSubmit={saveSlug} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Storefront slug
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                /store/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="acme-store"
                pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]"
                maxLength={32}
                required
                className="flex-1 rounded-r-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Lowercase letters, numbers, and hyphens. 3–32 characters.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Catalog tagline (optional)
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Quality goods, fair prices."
              maxLength={140}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={catalogEnabled}
              onChange={(e) => setCatalogEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Catalog is published (visible on the public link)
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingSlug}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {savingSlug ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save storefront
            </button>
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
              >
                <ExternalLink size={14} /> Preview
              </a>
            ) : null}
          </div>

          {slugMessage ? (
            <div
              className={
                slugMessage.tone === 'ok'
                  ? 'rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700'
                  : 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'
              }
            >
              {slugMessage.text}
            </div>
          ) : null}
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 text-base font-semibold text-slate-900">Receipt numbering</div>
        <p className="mb-4 text-sm text-slate-500">
          The prefix appears on every receipt number you issue, e.g.{' '}
          <span className="font-mono">{(prefix || 'CT').toUpperCase()}-00042</span>.
        </p>
        <form onSubmit={savePrefix} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Receipt prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              maxLength={8}
              pattern="[A-Z0-9]{1,8}"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingPrefix}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {savingPrefix ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save prefix
          </button>
        </form>
        {prefixMessage ? (
          <div
            className={
              'mt-3 ' +
              (prefixMessage.tone === 'ok'
                ? 'rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700'
                : 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700')
            }
          >
            {prefixMessage.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}
