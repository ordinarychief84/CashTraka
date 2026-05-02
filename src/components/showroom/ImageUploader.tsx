'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, Loader2, ImagePlus, Move } from 'lucide-react';

type Props = {
  /// Current list of hosted image URLs (controlled). Keep state in the parent.
  value: string[];
  onChange: (next: string[]) => void;
  /// Hard cap matching the schema. Defaults to 8 (Product images cap).
  maxFiles?: number;
  /// Called when a per-file upload error happens.
  onError?: (msg: string) => void;
  /// Visual layout: "grid" for product images, "single" for an album cover.
  variant?: 'grid' | 'single';
  /// Optional helper text below the uploader.
  hint?: string;
  /// When variant=single, allow choosing one image (replace existing on upload).
  /// Ignored for grid.
  className?: string;
};

const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';

/**
 * Drag-drop image uploader. Keeps state external (`value` + `onChange`) so
 * the consumer form can include the URL list in its own submit payload.
 *
 * Sends multipart POST → /api/showroom/upload, expects { files: [{url}] }.
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

  const remaining = Math.max(0, maxFiles - value.length);

  const onPick = useCallback(
    async (filesIn: FileList | File[] | null) => {
      if (!filesIn) return;
      const files = Array.from(filesIn).slice(0, remaining);
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

  if (variant === 'single') {
    const url = value[0] ?? null;
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
          <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-border">
            <img
              src={url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={(e) =>
                onError?.('That image could not be loaded. Try uploading again.') ??
                ((e.currentTarget.style.display = 'none') as unknown as void)
              }
            />
            <div className="absolute inset-0 hidden items-end justify-end gap-2 bg-gradient-to-t from-black/40 to-transparent p-2 group-hover:flex">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow hover:bg-white"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-lg bg-red-500/95 px-2.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-500"
              >
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
            <span className="text-xs text-slate-400">PNG, JPG or WEBP · up to 5 MB</span>
          </button>
        )}
        {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  }

  // Grid (multi-file)
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
          {value.map((url, i) => (
            <li
              key={url + i}
              className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-border"
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                  onError?.('Image could not be loaded.');
                }}
              />
              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Main
                </span>
              ) : null}
              <div className="absolute inset-0 hidden items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-1.5 group-hover:flex">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    title="Move left"
                    className="rounded-md bg-white/90 p-1 text-slate-700 hover:bg-white disabled:opacity-30"
                  >
                    <Move size={11} />
                  </button>
                </div>
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
          ))}

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
            Up to {maxFiles} images · PNG, JPG, WEBP · 5 MB each
          </span>
        </button>
      )}

      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
