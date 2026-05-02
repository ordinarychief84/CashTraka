'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  Loader2,
  Lock,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

type ProductLite = {
  id: string;
  name: string;
  price: number;
  images: string[];
};

export type AlbumEditorMode = 'new' | 'edit';

export type AlbumEditorInitial = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  passcodeRequired: boolean;
  /// Cleartext is shown only if the seller chose to display it. We never
  /// hydrate this from the server (we don't know the original passcode);
  /// the field is for setting a new one.
  passcode: string;
  isPublished: boolean;
  productIds: string[];
};

type Props = {
  mode: AlbumEditorMode;
  storefrontSlug: string | null;
  appUrl: string;
  initial: AlbumEditorInitial;
  /** All non-archived products belonging to this seller. */
  catalog: ProductLite[];
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function AlbumEditor({
  mode,
  storefrontSlug,
  appUrl,
  initial,
  catalog,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(mode === 'edit' && !!initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [passcodeRequired, setPasscodeRequired] = useState(initial.passcodeRequired);
  const [passcode, setPasscode] = useState(initial.passcode);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [productIds, setProductIds] = useState<string[]>(initial.productIds);

  const productMap = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const selected = productIds
    .map((id) => productMap.get(id))
    .filter((p): p is ProductLite => !!p);
  const available = catalog.filter((p) => !productIds.includes(p.id));

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function add(productId: string) {
    setProductIds((prev) => [...prev, productId]);
  }
  function remove(productId: string) {
    setProductIds((prev) => prev.filter((id) => id !== productId));
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= productIds.length) return;
    setProductIds((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (mode === 'new') {
        const res = await fetch('/api/sell/albums', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            coverImageUrl: coverImageUrl.trim() || undefined,
            passcodeRequired,
            passcode: passcodeRequired && passcode ? passcode : undefined,
            isPublished,
            productIds,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; data?: { id?: string } };
        if (!res.ok) {
          setError(json.error ?? 'Could not create album.');
          setSaving(false);
          return;
        }
        const id = json.data?.id;
        startTransition(() => router.push(id ? `/sell/albums/${id}/edit` : '/sell/albums'));
        return;
      }

      // Edit mode — issue separate PATCH (meta) and POST (products) calls.
      const albumId = initial.id;
      if (!albumId) throw new Error('Missing album id');
      const patchBody: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        isPublished,
        passcodeRequired,
      };
      // Send a new passcode only when the seller typed one in this session.
      if (passcodeRequired && passcode) patchBody.passcode = passcode;
      if (!passcodeRequired) patchBody.passcode = null;

      const [patchRes, productsRes] = await Promise.all([
        fetch(`/api/sell/albums/${albumId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patchBody),
        }),
        fetch(`/api/sell/albums/${albumId}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productIds }),
        }),
      ]);
      if (!patchRes.ok) {
        const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Could not update album.');
        setSaving(false);
        return;
      }
      if (!productsRes.ok) {
        const j = (await productsRes.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Could not update album products.');
        setSaving(false);
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlbum() {
    if (mode !== 'edit' || !initial.id) return;
    if (!confirm('Delete this album? Customers with the link will see "Album not available".')) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sell/albums/${initial.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Could not delete.');
        setSaving(false);
        return;
      }
      startTransition(() => router.push('/sell/albums'));
    } catch {
      setError('Network error.');
      setSaving(false);
    }
  }

  // Computed share helpers — only meaningful on existing, published albums.
  const publicUrl =
    storefrontSlug && initial.id && slug
      ? `${appUrl}/store/${storefrontSlug}/album/${slug}`
      : null;

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-3">
      {/* Left: meta */}
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Album details
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Summer 2026"
                maxLength={80}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-500">
                  /album/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase());
                    setSlugTouched(true);
                  }}
                  pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]"
                  maxLength={32}
                  required
                  disabled={mode === 'edit'}
                  className="flex-1 rounded-r-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Lowercase letters, numbers, hyphens. {mode === 'edit' && 'Locked once created (would break shared links).'}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cover image URL (optional)
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="Defaults to first product's first image"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Published (visible on storefront)
            </label>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={passcodeRequired}
                onChange={(e) => setPasscodeRequired(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <div className="flex-1">
                <div className="font-medium text-ink">Require a passcode</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Customers must enter the passcode you share before they can view the products.
                </div>
                {passcodeRequired ? (
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={mode === 'edit' ? 'Leave blank to keep current passcode' : 'e.g. 4321'}
                    minLength={4}
                    maxLength={64}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                ) : null}
              </div>
            </label>
          </div>
        </div>

        {/* Selected products */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Products in this album ({selected.length})
            </div>
            <div className="text-xs text-slate-500">Drag arrows to reorder</div>
          </div>
          {selected.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-6 text-center text-sm text-slate-500">
              No products yet. Add some from the catalog on the right.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selected.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      title="Move up"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-ink disabled:opacity-30"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === selected.length - 1}
                      title="Move down"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{p.name}</div>
                    <div className="num text-xs text-brand-600">
                      ₦{p.price.toLocaleString('en-NG')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    title="Remove"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: catalog picker + share + actions */}
      <div className="space-y-4">
        {/* Share helper for edit mode + published */}
        {mode === 'edit' && publicUrl ? (
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Share with customer
            </div>
            <ShareBlock
              url={publicUrl}
              title={title}
              passcode={passcodeRequired ? passcode : null}
            />
          </div>
        ) : null}

        {/* Catalog picker */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Add from catalog
          </div>
          {available.length === 0 ? (
            <div className="text-xs text-slate-500">All your products are in this album.</div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {available.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-slate-100">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-ink">{p.name}</div>
                    <div className="num text-[10px] text-slate-500">
                      ₦{p.price.toLocaleString('en-NG')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(p.id)}
                    title="Add to album"
                    className="rounded-md p-1.5 text-brand-600 hover:bg-brand-50"
                  >
                    <Plus size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-border bg-white p-5">
          {error ? (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          ) : null}
          <button
            type="submit"
            disabled={saving || pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving || pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {mode === 'new' ? 'Create album' : 'Save changes'}
          </button>
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={deleteAlbum}
              disabled={saving || pending}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={12} /> Delete album
            </button>
          ) : null}
          <Link
            href="/sell/albums"
            className="mt-2 block text-center text-xs text-slate-500 hover:underline"
          >
            Back to albums
          </Link>
        </div>
      </div>
    </form>
  );
}

function ShareBlock({
  url,
  title,
  passcode,
}: {
  url: string;
  title: string;
  passcode: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const message =
    `Here's our ${title} catalog:\n${url}` +
    (passcode ? `\nPasscode: ${passcode}` : '');

  function copy() {
    if (typeof window === 'undefined') return;
    navigator.clipboard
      .writeText(message)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => null);
  }

  function share() {
    const href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(href, '_blank');
  }

  return (
    <div className="space-y-2">
      <div className="break-all rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-slate-700">
        {url}
      </div>
      {passcode ? (
        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          <Lock size={10} /> Passcode: <span className="font-mono">{passcode}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500"
        >
          <ExternalLink size={12} /> Open
        </a>
      </div>
      <button
        type="button"
        onClick={share}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1fbd5b]"
      >
        <MessageCircle size={12} />
        Share on WhatsApp
      </button>
    </div>
  );
}
