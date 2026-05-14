'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Upload,
  ExternalLink,
  Trash2,
  Share2,
  AlertTriangle,
} from 'lucide-react';

export type CertificateRow = {
  id: string;
  kind: string;
  label: string;
  certificateNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  fileUrl: string;
  mimeType: string | null;
  publicToken: string | null;
  productName: string | null;
};

const KINDS = [
  'NAFDAC',
  'CAC',
  'TIN',
  'FDA',
  'SON',
  'HALAL',
  'ORGANIC',
  'OTHER',
];

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Client UI for the certificate vault. Single page lists every cert,
 * inline "upload new" form at the top. Each row shows expiry status,
 * a public-link share button, and a delete (soft-delete) button.
 */
export function CertificateVault({ initial }: { initial: CertificateRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<CertificateRow[]>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleUpload(formData: FormData) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/certificates', { method: 'POST', body: formData });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { certificate?: CertificateRow };
        error?: string;
      };
      if (!res.ok || body.success === false) {
        setError(body.error || 'Upload failed');
        return;
      }
      if (body.data?.certificate) {
        setRows((r) => [body.data!.certificate as CertificateRow, ...r]);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this certificate from the vault?')) return;
    const res = await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((r) => r.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert('Could not remove');
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const file = fd.get('file');
          if (!(file instanceof File) || file.size === 0) {
            setError('Pick a file first');
            return;
          }
          const meta = {
            kind: fd.get('kind'),
            label: fd.get('label'),
            certificateNumber: fd.get('certificateNumber') || null,
            issuedAt: fd.get('issuedAt') || null,
            expiresAt: fd.get('expiresAt') || null,
            notes: fd.get('notes') || null,
          };
          const out = new FormData();
          out.append('file', file);
          out.append('meta', JSON.stringify(meta));
          handleUpload(out);
          (e.currentTarget as HTMLFormElement).reset();
        }}
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <Upload size={14} />
          Add a certificate
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Kind</span>
            <select name="kind" required className="input w-full">
              {KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Label</span>
            <input name="label" required maxLength={200} placeholder="NAFDAC for Shea Body Butter" className="input w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Certificate #</span>
            <input name="certificateNumber" maxLength={120} placeholder="A1-1234L" className="input w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-slate-600">File (PDF or image, max 10 MB)</span>
            <input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="block w-full text-xs text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Issued</span>
            <input name="issuedAt" type="date" className="input w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Expires</span>
            <input name="expiresAt" type="date" className="input w-full" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Notes</span>
            <textarea name="notes" rows={2} maxLength={1000} className="input w-full" placeholder="What's the scope of this cert?" />
          </label>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-red-700" role="alert">{error}</p>
        ) : null}
        <button type="submit" disabled={submitting} className="btn-primary mt-4 text-sm">
          {submitting ? 'Uploading…' : 'Add certificate'}
        </button>
      </form>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <ShieldCheck size={14} />
          Your vault ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing yet. Upload the first one above — NAFDAC, CAC, or whichever
            cert is closest to expiry.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((c) => {
              const days = daysUntil(c.expiresAt);
              const expired = days != null && days < 0;
              const expiringSoon = days != null && days >= 0 && days <= 60;
              return (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                        {c.kind}
                      </span>
                      <span className="text-sm font-semibold text-ink">{c.label}</span>
                      {expired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          <AlertTriangle size={10} /> Expired
                        </span>
                      ) : expiringSoon ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          <AlertTriangle size={10} /> {days}d left
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {c.certificateNumber ? <span>No. {c.certificateNumber}</span> : null}
                      {c.productName ? <span>For: {c.productName}</span> : null}
                      {c.expiresAt ? (
                        <span>
                          Expires {new Date(c.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={c.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open file"
                      className="rounded-md border border-border bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-brand-700"
                    >
                      <ExternalLink size={14} />
                    </a>
                    {c.publicToken ? (
                      <button
                        type="button"
                        title="Copy public verify link"
                        onClick={() => {
                          const url = `${window.location.origin}/c/${c.publicToken}`;
                          navigator.clipboard.writeText(url);
                        }}
                        className="rounded-md border border-border bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-brand-700"
                      >
                        <Share2 size={14} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      title="Remove from vault"
                      onClick={() => handleDelete(c.id)}
                      className="rounded-md border border-border bg-white p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
