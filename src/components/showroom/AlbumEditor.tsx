'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
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
  Search,
  ChevronLeft,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { SafeImage } from '@/components/SafeImage';

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
  passcode: string;
  isPublished: boolean;
  productIds: string[];
};

type Props = {
  mode: AlbumEditorMode;
  storefrontSlug: string | null;
  appUrl: string;
  initial: AlbumEditorInitial;
  catalog: ProductLite[];
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function formatNaira(n: number): string {
  return '₦' + n.toLocaleString('en-NG');
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
  const titleRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(mode === 'edit' && !!initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [passcodeRequired, setPasscodeRequired] = useState(initial.passcodeRequired);
  const [passcode, setPasscode] = useState(initial.passcode);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [productIds, setProductIds] = useState<string[]>(initial.productIds);
  const [pickerQuery, setPickerQuery] = useState('');

  const productMap = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const selected = productIds
    .map((id) => productMap.get(id))
    .filter((p): p is ProductLite => !!p);

  const filteredAvailable = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return catalog.filter(
      (p) =>
        !productIds.includes(p.id) && (q === '' || p.name.toLowerCase().includes(q)),
    );
  }, [catalog, pickerQuery, productIds]);

  const titleEmpty = title.trim().length === 0;
  const slugTooShort = slug.trim().length < 3;
  const canSave = !titleEmpty && !slugTooShort;

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

  // Live preview cover — explicit cover wins; otherwise first product's first image.
  const previewCover = coverImageUrl || selected[0]?.images?.[0] || null;

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    if (titleEmpty) {
      setError('Give the album a name to continue.');
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleRef.current?.focus();
      return;
    }
    if (slugTooShort) {
      setError('The link slug needs at least 3 characters.');
      slugRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      slugRef.current?.focus();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (mode === 'new') {
        const res = await fetch('/api/showroom/albums', {
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
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          data?: { id?: string };
        };
        if (!res.ok) {
          setError(json.error ?? 'Could not create album.');
          setSaving(false);
          return;
        }
        const id = json.data?.id;
        startTransition(() =>
          router.push(id ? `/showroom/albums/${id}/edit` : '/showroom/albums'),
        );
        return;
      }

      // Edit mode — separate PATCH (meta) and POST (products).
      const albumId = initial.id;
      if (!albumId) throw new Error('Missing album id');
      const patchBody: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        isPublished,
        passcodeRequired,
      };
      if (passcodeRequired && passcode) patchBody.passcode = passcode;
      if (!passcodeRequired) patchBody.passcode = null;

      const [patchRes, productsRes] = await Promise.all([
        fetch(`/api/showroom/albums/${albumId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patchBody),
        }),
        fetch(`/api/showroom/albums/${albumId}/products`, {
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
    if (
      !confirm(
        'Delete this album? Customers with the link will see "Album not available".',
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/showroom/albums/${initial.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Could not delete.');
        setSaving(false);
        return;
      }
      startTransition(() => router.push('/showroom/albums'));
    } catch {
      setError('Network error.');
      setSaving(false);
    }
  }

  const publicUrl =
    storefrontSlug && slug
      ? `${appUrl}/store/${storefrontSlug}/album/${slug}`
      : null;

  return (
    <div className="pb-40 md:pb-24">
      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* LEFT: form */}
        <div className="space-y-5">
          {/* Hero title row */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Name your album"
              maxLength={80}
              required
              aria-label="Album name"
              className="w-full border-0 bg-transparent p-0 text-xl font-bold text-ink outline-none placeholder:text-slate-300 focus:ring-0 sm:text-2xl"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              <span className="text-slate-400">Public link:</span>
              <span className="break-all font-mono">
                {storefrontSlug ? `/store/${storefrontSlug}/album/` : '/album/'}
              </span>
              <input
                ref={slugRef}
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
                aria-label="Album link slug"
                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-brand-700 focus:border-brand-500 focus:bg-white focus:outline-none disabled:text-slate-500"
              />
              {mode === 'edit' ? (
                <span className="text-[10px] text-slate-400">(locked)</span>
              ) : null}
            </div>
          </div>

          {/* Cover image + description */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label>Cover image</Label>
                <ImageUploader
                  variant="single"
                  value={coverImageUrl ? [coverImageUrl] : []}
                  onChange={(urls) => setCoverImageUrl(urls[0] ?? '')}
                  onError={(msg) => setError(msg)}
                  hint="Falls back to your first product's first image."
                />
              </div>

              <div>
                <Label>Description (optional)</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A few words customers will see above the products. e.g. 'New arrivals, message us for sizes'."
                  rows={6}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <div className="mt-1 text-right text-[11px] text-slate-400">
                  {description.length}/500
                </div>
              </div>
            </div>
          </div>

          {/* Visibility + privacy */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <Label>Visibility</Label>
            <div className="space-y-2.5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    {isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                    {isPublished ? 'Published' : 'Hidden'}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {isPublished
                      ? 'Visible on your storefront homepage.'
                      : 'Only people with the direct link can find it.'}
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300">
                <input
                  type="checkbox"
                  checked={passcodeRequired}
                  onChange={(e) => setPasscodeRequired(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Lock size={14} />
                    Require a passcode
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Customers must enter the code you share on WhatsApp before they see the
                    products.
                  </div>
                  {passcodeRequired ? (
                    <input
                      type="text"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder={
                        mode === 'edit'
                          ? 'Leave blank to keep current passcode'
                          : 'e.g. 4321'
                      }
                      minLength={4}
                      maxLength={64}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  ) : null}
                </div>
              </label>
            </div>
          </div>

          {/* Products: selected + picker */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Label className="m-0">Products in this album</Label>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {selected.length} {selected.length === 1 ? 'item' : 'items'}
                </span>
                <Link
                  href="/products/new"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600"
                >
                  <Plus size={11} /> New product
                </Link>
              </div>
            </div>

            {/* Selected products list, only shown when there ARE selections */}
            {selected.length > 0 ? (
              <>
                {selected.some((p) => !p.images?.[0]) ? (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <div className="font-semibold">
                      {selected.filter((p) => !p.images?.[0]).length} product
                      {selected.filter((p) => !p.images?.[0]).length === 1 ? '' : 's'} in this album
                      {' '}have no photos.
                    </div>
                    <div className="mt-0.5">
                      They will show as a grey placeholder on the public page. Tap "Add photos"
                      next to each one to fix this.
                    </div>
                  </div>
                ) : null}
                <ul className="mb-3 divide-y divide-slate-100 rounded-lg ring-1 ring-border">
                  {selected.map((p, i) => {
                    const hasImage = !!p.images?.[0];
                    return (
                      <li
                        key={p.id}
                        className={
                          'flex items-center gap-3 px-3 py-2.5 ' +
                          (hasImage ? 'bg-white' : 'bg-amber-50/40')
                        }
                      >
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
                        <SafeImage
                          src={p.images[0]}
                          alt={p.name}
                          className={
                            'h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ' +
                            (hasImage ? 'bg-slate-100 ring-border' : 'bg-amber-100 ring-amber-300')
                          }
                          fallback={
                            <div className="flex h-full w-full items-center justify-center text-amber-500">
                              <ImageIcon size={14} />
                            </div>
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-ink">{p.name}</div>
                          <div className="num text-xs text-brand-600">{formatNaira(p.price)}</div>
                          {!hasImage ? (
                            <Link
                              href={`/products/${p.id}/edit`}
                              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900"
                            >
                              <ImageIcon size={11} /> Add photos
                            </Link>
                          ) : null}
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
                    );
                  })}
                </ul>
              </>
            ) : null}

            {/* Empty catalog: full empty-state CTA */}
            {catalog.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-border">
                  <ImageIcon size={18} />
                </div>
                <div className="text-sm font-medium text-slate-700">
                  You have not added any products yet
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Create a product first (with photos), then come back to add it to this album.
                </div>
                <Link
                  href="/products/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  <Plus size={12} /> Create a product
                </Link>
              </div>
            ) : (
              /* Catalog has items: show the picker prominently as the action surface */
              <div className={selected.length > 0 ? 'border-t border-border pt-4' : ''}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="m-0">
                    {selected.length === 0 ? 'Pick products to add' : 'Add more from your catalog'}
                    <span className="ml-1 font-normal text-slate-400">
                      ({filteredAvailable.length})
                    </span>
                  </Label>
                </div>
                <div className="relative mb-2">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                {filteredAvailable.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-500">
                    {pickerQuery
                      ? 'No products match.'
                      : 'All your products are in this album.'}
                  </div>
                ) : (
                  <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg ring-1 ring-border">
                    {filteredAvailable.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-2 bg-white px-2.5 py-2 hover:bg-slate-50"
                      >
                        <SafeImage
                          src={p.images[0]}
                          alt={p.name}
                          className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-slate-100"
                          fallback={
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImageIcon size={12} />
                            </div>
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-ink">
                            {p.name}
                          </div>
                          <div className="num text-[10px] text-slate-500">
                            {formatNaira(p.price)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => add(p.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100"
                        >
                          <Plus size={11} /> Add
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: live preview + share */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Preview
              </span>
              {publicUrl && mode === 'edit' ? (
                <Link
                  href={publicUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  <ExternalLink size={11} /> Open live
                </Link>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border transition hover:shadow-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <SafeImage
                  src={previewCover}
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      Cover preview
                    </div>
                  }
                />
                {passcodeRequired ? (
                  <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                    <Lock size={10} /> Private
                  </div>
                ) : null}
                {!isPublished ? (
                  <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <EyeOff size={10} /> Hidden
                  </div>
                ) : null}
              </div>
              <div className="p-3">
                <div className="line-clamp-2 text-sm font-semibold text-ink">
                  {title || 'Album name'}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {selected.length} {selected.length === 1 ? 'item' : 'items'}
                </div>
              </div>
            </div>
          </div>

          {/* Share helper, only on edit + meaningful URL */}
          {mode === 'edit' && publicUrl ? (
            <ShareBlock
              url={publicUrl}
              title={title || 'Album'}
              passcode={passcodeRequired ? passcode : null}
            />
          ) : null}

          {mode === 'new' ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-semibold text-slate-700">Tip</div>
              Once saved, you&apos;ll get a copy/share button and a live preview link to send
              customers on WhatsApp.
            </div>
          ) : null}
        </aside>
      </form>

      {/* Sticky action bar, lifts above mobile BottomNav (h-16) */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/showroom/albums"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-ink"
          >
            <ChevronLeft size={14} /> Back
          </Link>
          <div className="flex items-center gap-2">
            {error ? (
              <div className="hidden text-xs text-red-700 sm:block">{error}</div>
            ) : null}
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={deleteAlbum}
                disabled={saving || pending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={12} /> Delete
              </button>
            ) : null}
            <button
              type="submit"
              onClick={save}
              disabled={saving || pending}
              title={
                titleEmpty
                  ? 'Add an album name first'
                  : slugTooShort
                    ? 'Link slug needs at least 3 characters'
                    : undefined
              }
              className={
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ' +
                (canSave
                  ? 'bg-brand-500 hover:bg-brand-600'
                  : 'bg-slate-400 hover:bg-slate-500')
              }
            >
              {saving || pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {mode === 'new' ? 'Create album' : 'Save changes'}
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-2 text-center text-xs text-red-700 sm:hidden">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ' +
        (className || '')
      }
    >
      {children}
    </div>
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
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Share with customer
      </div>
      <div className="break-all rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-700">
        {url}
      </div>
      {passcode ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          <Lock size={10} /> Passcode: <span className="font-mono">{passcode}</span>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1fbd5b]"
        >
          <MessageCircle size={12} /> WhatsApp
        </button>
      </div>
    </div>
  );
}
