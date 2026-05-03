import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatNaira, formatDate } from '@/lib/format';
import { effectivePlan, limitsFor } from '@/lib/plan-limits';
import {
  vatReturnService,
  periodLabel,
  type VatPeriod,
} from '@/lib/services/vat-return.service';
import { GenerateVatReturnForm } from './GenerateVatReturnForm';

export const dynamic = 'force-dynamic';

/**
 * VAT returns dashboard, Tax+ tier feature.
 *
 * Page surface:
 *   - "Generate" form (period + reference date) at the top
 *   - Past returns table below with PDF / CSV / Mark filed actions
 *
 * If the seller's plan does not include `vatReturns`, render a soft
 * upgrade nudge instead of the controls so the page still loads
 * cleanly for downgraded users.
 */
export default async function VatReturnsPage() {
  const user = await guard();
  const eff = effectivePlan(user);
  const limits = limitsFor(eff.plan);

  if (!limits.vatReturns) {
    return (
      <AppShell
        businessName={user.businessName}
        userName={user.name}
        businessType={user.businessType}
        accessRole={user.accessRole}
        principalName={user.principalName}
      >
        <PageHeader
          title="VAT returns"
          subtitle="Generate FIRS-format VAT returns from your invoices and expenses."
        />
        <EmptyState
          icon={FileSpreadsheet}
          title="VAT returns are part of Tax+"
          description="Upgrade to the Tax+ tier to auto-build your monthly or quarterly VAT return from CashTraka data, ready for FIRS filing."
          actionHref="/settings?upgrade=tax_plus_quarterly"
          actionLabel="See Tax+ plans"
        />
      </AppShell>
    );
  }

  const rows = await vatReturnService.listVatReturns(user.id);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="VAT returns"
        subtitle="Generate FIRS-format VAT returns from your invoices and expenses."
      />

      <div className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-1 text-sm font-semibold text-ink">
          Generate a return
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Pick the period that contains the date you want to file. Quarterly
          covers three calendar months (Q1 = Jan to Mar, etc.). Monthly covers
          the calendar month around the reference date.
        </p>
        <GenerateVatReturnForm />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No VAT returns yet"
          description="Use the form above to build your first return. Drafts can be regenerated until you mark them filed."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Range</th>
                <th className="px-3 py-2 text-right">Output VAT</th>
                <th className="px-3 py-2 text-right">Input VAT</th>
                <th className="px-3 py-2 text-right">Net VAT</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const label = periodLabel(r.period as VatPeriod, r.periodStart);
                const isFiled = r.status === 'FILED';
                const netNaira = Math.round(r.netVatKobo / 100);
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-brand-600">
                      <Link href={`/vat-returns/${r.id}`}>{label}</Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink">
                      {formatNaira(Math.round(r.outputVatKobo / 100))}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink">
                      {formatNaira(Math.round(r.inputVatKobo / 100))}
                    </td>
                    <td
                      className={
                        'num px-3 py-2 text-right font-semibold ' +
                        (netNaira < 0 ? 'text-success-700' : 'text-ink')
                      }
                    >
                      {formatNaira(Math.abs(netNaira))}
                      {netNaira < 0 ? ' refund' : ''}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                          (isFiled
                            ? 'bg-success-50 text-success-700'
                            : 'bg-slate-100 text-slate-600')
                        }
                      >
                        {isFiled ? 'Filed' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/vat-returns/${r.id}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                        <a
                          href={`/api/vat-returns/${r.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
                        >
                          PDF
                        </a>
                        <a
                          href={`/api/vat-returns/${r.id}/csv`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
                        >
                          CSV
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
