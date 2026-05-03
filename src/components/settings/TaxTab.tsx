'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Loader2,
  AlertTriangle,
  Info,
  FileSpreadsheet,
  Archive,
  ArrowRight,
} from 'lucide-react';

type Props = {
  initial: {
    tin: string;
    vatRegistered: boolean;
    vatRate: number;
    firsMerchantId: string;
    businessAddress: string;
  };
};

/**
 * Tax compliance settings, Nigerian (FIRS) e-invoicing.
 *
 * What goes here, in tax-law terms:
 *   - TIN: required on every tax invoice once VAT-registered.
 *   - vatRegistered: businesses with annual turnover > ₦25,000,000 are
 *     required to register and charge VAT. Below that, registration is
 *     optional. Toggle it once you're registered with FIRS.
 *   - vatRate: standard rate is 7.5% (Nigeria). Some categories carry
 *     different rates; per-invoice override is supported elsewhere.
 *   - firsMerchantId: assigned by FIRS once the business onboards to MBS
 *     (Merchant Buyer Solution). Required by the real FIRS adapter; until
 *     then, submissions go through the NoopFIRSAdapter (returns "not
 *     configured").
 */
export function TaxTab({ initial }: Props) {
  const [tin, setTin] = useState(initial.tin);
  const [vatRegistered, setVatRegistered] = useState(initial.vatRegistered);
  const [vatRate, setVatRate] = useState(initial.vatRate);
  const [firsMerchantId, setFirsMerchantId] = useState(initial.firsMerchantId);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const hasAddress = !!initial.businessAddress;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tin: tin.trim(),
          vatRegistered,
          vatRate,
          firsMerchantId: firsMerchantId.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ tone: 'err', text: json.error ?? 'Could not save.' });
      } else {
        setMessage({ tone: 'ok', text: 'Tax settings saved.' });
      }
    } catch {
      setMessage({ tone: 'err', text: 'Network error. Try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <TaxPlusSections />

      {!hasAddress ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            Your <strong>business address</strong> is empty. Tax invoices must include the
            seller&apos;s address. Set it on the <strong>Profile</strong> tab.
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 text-base font-semibold text-slate-900">
          Tax identification
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Required on tax invoices once you&apos;re registered with FIRS.
        </p>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tax Identification Number (TIN)
            </label>
            <input
              type="text"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              placeholder="e.g. 12345678-0001"
              maxLength={20}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Issued by the Federal Inland Revenue Service. Find yours on your TIN certificate
              or at <a href="https://tin.jtb.gov.ng" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">tin.jtb.gov.ng</a>.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={vatRegistered}
              onChange={(e) => setVatRegistered(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <div className="flex-1">
              <div className="font-medium text-ink">VAT-registered with FIRS</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Required for businesses with annual turnover above <strong>₦25,000,000</strong>.
                Optional below that threshold. When enabled, invoices include a VAT line at the
                rate below.
              </div>
            </div>
          </label>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Default VAT rate (%)
            </label>
            <input
              type="number"
              step="0.5"
              min={0}
              max={50}
              value={vatRate}
              onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
              disabled={!vatRegistered}
              className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />
            <p className="mt-1 text-xs text-slate-500">
              Standard Nigerian rate is <strong>7.5%</strong>. Each invoice can override this.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              FIRS Merchant ID (MBS)
            </label>
            <input
              type="text"
              value={firsMerchantId}
              onChange={(e) => setFirsMerchantId(e.target.value)}
              placeholder="(leave empty if not yet onboarded)"
              maxLength={64}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Issued by FIRS once you onboard to the Merchant Buyer Solution e-invoicing
              programme. Required for live submission to FIRS, until then, the &quot;Submit
              to FIRS&quot; action will fail with a clear &quot;adapter not configured&quot;
              error.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save tax settings
          </button>

          {message ? (
            <div
              className={
                message.tone === 'ok'
                  ? 'rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700'
                  : 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'
              }
            >
              {message.text}
            </div>
          ) : null}
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <Info size={14} /> About FIRS e-invoicing
        </div>
        <p className="text-xs text-slate-600">
          Once FIRS issues you MBS credentials, set
          <span className="mx-1 rounded bg-white px-1 py-0.5 font-mono">FIRS_API_BASE_URL</span>
          and
          <span className="mx-1 rounded bg-white px-1 py-0.5 font-mono">FIRS_API_KEY</span>
          in your environment, then implement the real adapter in
          <span className="mx-1 rounded bg-white px-1 py-0.5 font-mono">
            src/lib/services/firs-invoice.service.ts
          </span>
          (the data shape already matches the FIRS spec). After that, every invoice can be
          submitted to FIRS, returning an IRN + QR code that prints on the invoice PDF.
        </p>
      </div>
    </div>
  );
}

/**
 * Tax+ tier shortcuts. Each section renders only when the seller's plan
 * actually includes the matching feature, loaded via /api/me/limits.
 */
type LimitsResponse = {
  vatReturns?: boolean;
  yearEndPack?: boolean;
};

type LatestReturn = {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
};

function TaxPlusSections() {
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [latest, setLatest] = useState<LatestReturn | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/me/limits');
        const json = (await res.json().catch(() => ({}))) as {
          data?: { limits?: LimitsResponse };
        };
        if (cancelled) return;
        setLimits(json.data?.limits ?? null);

        if (json.data?.limits?.vatReturns) {
          const r = await fetch('/api/vat-returns');
          const j = (await r.json().catch(() => ({}))) as {
            data?: LatestReturn[];
          };
          if (!cancelled) {
            setLatest(j.data && j.data.length > 0 ? j.data[0] : null);
          }
        }
      } catch {
        // soft-fail, render nothing
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!limits) return null;

  const showVat = !!limits.vatReturns;
  const showPack = !!limits.yearEndPack;
  if (!showVat && !showPack) return null;

  const today = new Date();
  // Default to last completed FY for the year-end download.
  const defaultYear = today.getFullYear() - 1;

  return (
    <div className="space-y-4">
      {showVat ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
            <FileSpreadsheet size={16} className="text-brand-600" />
            VAT returns
          </div>
          <p className="mb-3 text-sm text-slate-600">
            Auto-build your monthly or quarterly VAT return from CashTraka data.
            Download the PDF and CSV, then file with FIRS.
          </p>
          {latest ? (
            <p className="mb-3 text-xs text-slate-500">
              Most recent return:{' '}
              <span className="font-semibold text-slate-700">
                {new Date(latest.periodStart).toLocaleDateString('en-NG')} →{' '}
                {new Date(latest.periodEnd).toLocaleDateString('en-NG')}
              </span>{' '}
              · {latest.status === 'FILED' ? 'Filed' : 'Draft'}
            </p>
          ) : null}
          <Link
            href="/vat-returns"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Generate this period&apos;s VAT return
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}

      {showPack ? <YearEndPackCard defaultYear={defaultYear} /> : null}
    </div>
  );
}

function YearEndPackCard({ defaultYear }: { defaultYear: number }) {
  const [year, setYear] = useState<number>(defaultYear);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
        <Archive size={16} className="text-brand-600" />
        Year-end accountant pack
      </div>
      <p className="mb-3 text-sm text-slate-600">
        Download every receipt, invoice, credit note, payment, expense and VAT
        return for a single financial year as one zip file. Hand it straight to
        your accountant.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Financial year
          </label>
          <input
            type="number"
            min={2020}
            max={defaultYear + 1}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || defaultYear)}
            className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <a
          href={`/api/accountant-pack/${year}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Download accountant pack
        </a>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        We default to the last completed FY. Pick any past year you have data for.
      </p>
    </div>
  );
}
