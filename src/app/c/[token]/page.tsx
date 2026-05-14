import { notFound } from 'next/navigation';
import { ShieldCheck, CalendarClock, FileText } from 'lucide-react';
import { certificatesService } from '@/lib/services/certificates.service';

export const dynamic = 'force-dynamic';

/**
 * Public certificate verification page at /c/[token].
 *
 * Distributors and customers can hit this URL (printed on labels or
 * shared via WhatsApp) to verify a certificate is real and current.
 * No auth required; lookup is by the unguessable Certificate.publicToken.
 *
 * Shows:
 *   - business name
 *   - product (if per-product)
 *   - cert kind + label + issued/expiry
 *   - direct link to the hosted file
 *   - clear EXPIRED banner when past expiresAt
 */
export default async function CertVerifyPage({ params }: { params: { token: string } }) {
  const cert = await certificatesService.findPublicByToken(params.token);
  if (!cert) notFound();

  const business = cert.user.businessName || cert.user.name;
  const expired =
    cert.expiresAt != null && new Date(cert.expiresAt).getTime() < Date.now();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${expired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {cert.kind} Certificate
              </p>
              <h1 className="text-lg font-bold text-ink">{cert.label}</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Held by <strong>{business}</strong>
              </p>
            </div>
          </div>

          {expired ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              This certificate expired on{' '}
              {cert.expiresAt
                ? new Date(cert.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
              . Ask the business for a renewed copy before relying on it.
            </p>
          ) : null}

          <dl className="mt-4 space-y-2 text-sm">
            {cert.certificateNumber ? (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Number</dt>
                <dd className="font-mono font-semibold text-ink">{cert.certificateNumber}</dd>
              </div>
            ) : null}
            {cert.product ? (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Product</dt>
                <dd className="font-semibold text-ink">{cert.product.name}</dd>
              </div>
            ) : null}
            {cert.issuedAt ? (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Issued</dt>
                <dd className="font-semibold text-ink">
                  {new Date(cert.issuedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </dd>
              </div>
            ) : null}
            {cert.expiresAt ? (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Expires</dt>
                <dd className={'font-semibold ' + (expired ? 'text-rose-700' : 'text-ink')}>
                  {new Date(cert.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </dd>
              </div>
            ) : null}
          </dl>

          <a
            href={cert.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            <FileText size={15} />
            Open the document
          </a>

          <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-500">
            <CalendarClock size={12} className="mt-0.5 shrink-0" />
            <span>
              This verification page is read-only. Always check the issued and
              expiry dates against the regulator's own register before relying on
              a third-party certificate.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
