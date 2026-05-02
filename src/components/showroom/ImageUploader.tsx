'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Upload,
  X,
  Loader2,
  ImagePlus,
  Move,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

type Props = {
  /// Current list of hosted image URLs (controlled). Keep state in the parent.
  value: string[];
  onChange: (next: string[]) => void;
  /// Hard cap matching the schema. Defaults to 8 (Product images cap).
  maxFiles?: number;
  /// Called when a per-file UPLOAD error happens (not when a stored image
  /// later fails to render — those are handled silently inside the component).
  onError?: (msg: string) => void;
  /// Visual layout: "grid" for product images, "single" for an album cover.
  variant?: 'grid' | 'single';
  /// Optional helper text below the uploader.
  hint?: string;
  className?: string;
};

const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';

/**
 * Drag-drop image uploader. Keeps state external (`value` + `onChange`) so
 * the consumer form can include the URL list in its own submit payload.
 *
 * Broken-image handling: when an `<img>` fails to load (404 from the CDN,
 * network blip, etc.) we mark that index as broken and render a clear
 * "Image broken, replace" placeholder over it. We do NOT call onError for
 * render failures because the legacy URLs are noisy; they would push a
 * toast on every page load. The seller sees the broken state inline and
 * replaces with one tap.
 */
export function ImageUploader({
  value,
  onChange,
  maxFiles = 8,
  onError,
  variant = 'grid',
  hint,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());

  const remaining = Math.max(0, maxFiles - value.length);

  function markBroken(url: string) {
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }

  const onPick = useCallback(
    async (filesIn: FileList | File[] | null) => {
      if (!filesIn) return;
      const files = Array.from(filesIn).slice(0, remaining || 1);
      if (files.length === 0) {
        onError?.(`You can only upload up to ${maxFiles} images.`);
        return;
      }

      setUploading(files.length);
      try {
        const form = new FormData();
        for (const f of files) form.append('files', f);
        const res = await fetch('/api/showroom/upload', {
          method: 'POST',
          body: form,
        });
        const json = (await res.json().catch(() => ({}))) as {
          data?: { files?: Array<{ url: string }> };
          error?: string;
        };
        if (!res.ok) {
          onError?.(json.error ?? 'Upload failed.');
          return;
        }
        const urls = json.data?.files?.map((f) => f.url) ?? [];
        if (urls.length === 0) {
          onError?.('No images returned.');
          return;
        }
        if (variant === 'single') {
          onChange([urls[0]]);
        } else {
          onChange([...value, ...urls].slice(0, maxFiles));
        }
      } catch {
        onError?.('Network error during upload.');
      } finally {
        setUploading(0);
      }
    },
    [maxFiles, onChange, onError, remaining, value, variant],
  );

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading > 0) return;
    onPick(e.dataTransfer.files);
  }

  /* ─────────────────── Single variant (album cover) ─────────────────── */
  if (variant === 'single') {
    const url = value[0] ?? null;
    const isBroken = !!url && brokenUrls.has(url);

    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        {url ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-border">
            {!isBroken ? (
              <img
                src={url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={() => markBroken(url)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle size={16} />
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  Image not available
                </div>
                <div className="text-[11px] text-slate-500">
                  Tap Replace to upload again.
                </div>
              </div>
            )}

            {/* Always-visible action chips (touch-friendly), pinned bottom-right.
                On hover for mouse users they fade in slightly stronger. */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/55 to-transparent px-2 py-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-white"
              >
                <RefreshCw size={11} />
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setBrokenUrls(new Set());
                }}
                className="inline-flex items-center gap-1 rounded-md bg-red-500/95 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-red-500"
              >
                <X size={11} />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              'flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-slate-50 text-sm text-slate-500 transition ' +
              (dragOver
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-300 hover:border-brand-500 hover:text-brand-600')
            }
          >
            {uploading > 0 ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ImagePlus size={20} />
            )}
            <span className="font-medium">
              {uploading > 0 ? 'Uploading…' : 'Add cover image'}
            </span>
            <span className="text-xs text-slate-400">PNG, JPG or WEBP, up to 5 MB</span>
          </button>
        )}
        {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  }

  /* ─────────────────── Grid variant (product photos) ─────────────────── */
  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />

      {value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, i) => {
            const isBroken = brokenUrls.has(url);
            return (
              <li
                key={url + i}
                className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-border"
              >
                {!isBroken ? (
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={() => markBroken(url)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-[9px] font-semibold text-slate-600">
                      Broken
                    </span>
                  </div>
                )}

                {i === 0 && !isBroken ? (
                  <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Main
                  </span>
                ) : null}

                {/* Always-visible touch action bar */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent px-1 py-1">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    title="Move left"
                    className="rounded-md bg-white/90 p-1 text-slate-700 hover:bg-white disabled:opacity-30"
                  >
                    <Move size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    title="Remove"
                    className="rounded-md bg-red-500/95 p-1 text-white hover:bg-red-500"
                  >
                    <X size={11} />
                  </button>
                </div>
              </li>
            );
          })}

          {remaining > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading > 0}
                className={
                  'flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-slate-500 transition ' +
                  (uploading > 0
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-300 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600')
                }
              >
                {uploading > 0 ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImagePlus size={14} />
                )}
                <span className="font-medium">
                  {uploading > 0 ? 'Uploading' : 'Add'}
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={uploading > 0}
          className={
            'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-slate-50 px-4 py-8 text-sm text-slate-500 transition ' +
            (dragOver
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-slate-300 hover:border-brand-500 hover:text-brand-600')
          }
        >
          {uploading > 0 ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Upload size={22} />
          )}
          <span className="font-semibold">
            {uploading > 0 ? 'Uploading…' : 'Drop images or click to upload'}
          </span>
          <span className="text-xs text-slate-400">
            Up to {maxFiles} images, PNG, JPG, WEBP, 5 MB each
          </span>
        </button>
      )}

      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
