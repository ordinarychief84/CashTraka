import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { formatNaira, formatDate } from '@/lib/format';
import {
  vatReturnService,
  periodLabel,
  type VatPeriod,
} from '@/lib/services/vat-return.service';
import { MarkFiledButton } from './MarkFiledButton';

export const dynamic = 'force-dynamic';

export default async function VatReturnDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await guard();
  const result = await vatReturnService.getVatReturn(params.id, user.id);
  if (!result) notFound();

  const { vatReturn, invoices, expenses } = result;
  const isFiled = vatReturn.status === 'FILED';
  const label = periodLabel(vatReturn.period as VatPeriod, vatReturn.periodStart);
  const netNaira = Math.round(vatReturn.netVatKobo / 100);
  const isRefund = netNaira < 0;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={`VAT return ${label}`}
        subtitle={`${formatDate(vatReturn.periodStart)} → ${formatDate(vatReturn.periodEnd)} · ${
          isFiled ? 'Filed' : 'Draft'
        }`}
        backHref="/vat-returns"
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/vat-returns/${vatReturn.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download PDF
            </a>
            <a
              href={`/api/vat-returns/${vatReturn.id}/csv`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download CSV
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Output VAT"
          value={formatNaira(Math.round(vatReturn.outputVatKobo / 100))}
          tone="brand"
          sub={`${vatReturn.invoiceCount} invoices counted`}
        />
        <StatCard
          label="Input VAT"
          value={formatNaira(Math.round(vatReturn.inputVatKobo / 100))}
          tone="neutral"
          sub={`${vatReturn.expenseCount} expenses counted`}
        />
        <StatCard
          label={isRefund ? 'Net VAT refundable' : 'Net VAT due'}
          value={formatNaira(Math.abs(netNaira))}
          tone={isRefund ? 'brand' : netNaira > 0 ? 'danger' : 'neutral'}
          sub={isRefund ? 'You can claim this back' : 'Pay this to FIRS'}
        />
        <StatCard
          label="Status"
          value={isFiled ? 'Filed' : 'Draft'}
          tone={isFiled ? 'brand' : 'neutral'}
          sub={
            isFiled && vatReturn.filedAt
              ? `Filed ${formatDate(vatReturn.filedAt)}`
              : 'Mark filed once submitted'
          }
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-1 text-sm font-semibold text-ink">Filing</div>
        {isFiled ? (
          <p className="text-xs text-slate-500">
            This return is locked. FIRS reference:{' '}
            <span className="font-mono text-slate-700">
              {vatReturn.firsReference || 'not recorded'}
            </span>
          </p>
        ) : (
          <MarkFiledButton id={vatReturn.id} />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b border-border bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contributing invoices
          </div>
          {invoices.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">
              No invoices contributed to output VAT this period.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.slice(0, 50).map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs text-brand-600">
                      {it.invoiceNumber}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatDate(it.issuedAt)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{it.customerName}</td>
                    <td className="num px-3 py-2 text-right text-slate-700">
                      {formatNaira(Math.round(it.total / 100))}
                    </td>
                    <td className="num px-3 py-2 text-right font-semibold text-ink">
                      {formatNaira(Math.round(it.tax / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b border-border bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contributing expenses
          </div>
          {expenses.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">
              No expenses contributed to input VAT this period.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">VAT paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.slice(0, 50).map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatDate(ex.incurredOn)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {[ex.category, ex.vendor, ex.note]
                        .filter(Boolean)
                        .join(' · ') || ex.category}
                    </td>
                    <td className="num px-3 py-2 text-right text-slate-700">
                      {formatNaira(Math.round(ex.amount / 100))}
                    </td>
                    <td className="num px-3 py-2 text-right font-semibold text-ink">
                      {formatNaira(Math.round(ex.vatPaid / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
