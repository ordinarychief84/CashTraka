import Link from 'next/link';
import { Factory, ArrowLeft } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { formatKobo } from '@/lib/format';

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_DAYS = 90;

/**
 * Margin-per-batch report.
 *
 * Answers the single question every batch maker asks: "for this run, did
 * I make money?" Pulls every COMPLETED ProductionOrder in the last 90
 * days, computes:
 *
 *   - actual material cost  = Σ (unitCostKoboSnapshot × quantity)
 *     (Snapshot captured at completion in production-orders.service.ts,
 *      so it doesn't drift when material prices change later.)
 *   - revenue (best-effort)  = price × quantity at completion time
 *     (Product.priceKobo × quantity if available; else uses
 *      CustomerOrder.totalKobo proportionally when one was linked.)
 *   - margin                  = revenue − cost
 *   - margin %                = margin / revenue
 *
 * Rolls everything up at the top so users see total cost / revenue /
 * margin for the period at a glance.
 */
export default async function MarginsReportPage() {
  const user = await guard();
  const windowStart = new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const completedOrders = await prisma.productionOrder.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      status: 'COMPLETED',
      completedAt: { gte: windowStart },
    },
    orderBy: { completedAt: 'desc' },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, priceKobo: true } },
        },
      },
      customerOrder: { select: { totalKobo: true, customerName: true } },
    },
    take: 200,
  });

  type Row = {
    id: string;
    productionNumber: string;
    completedAt: Date | null;
    customerName: string | null;
    productSummary: string;
    quantity: number;
    revenueKobo: number;
    costKobo: number;
    marginKobo: number;
    marginPct: number | null;
  };

  const rows: Row[] = completedOrders.map((po) => {
    const totalQuantity = po.items.reduce((sum, it) => sum + it.quantity, 0);
    const costKobo = po.items.reduce(
      (sum, it) => sum + (it.unitCostKoboSnapshot ?? 0) * it.quantity,
      0,
    );

    // Revenue: prefer the linked CustomerOrder.totalKobo when present
    // (it's the actual sale price). Fall back to Product.priceKobo ×
    // quantity when production was made-to-stock with no order attached.
    let revenueKobo = 0;
    if (po.customerOrder?.totalKobo) {
      revenueKobo = po.customerOrder.totalKobo;
    } else {
      revenueKobo = po.items.reduce(
        (sum, it) => sum + (it.product?.priceKobo ?? 0) * it.quantity,
        0,
      );
    }

    const marginKobo = revenueKobo - costKobo;
    const marginPct =
      revenueKobo > 0 ? Math.round((marginKobo / revenueKobo) * 10000) / 100 : null;

    const productSummary = po.items
      .slice(0, 2)
      .map((it) => `${it.quantity} × ${it.product?.name ?? 'product'}`)
      .join(', ') + (po.items.length > 2 ? ` +${po.items.length - 2} more` : '');

    return {
      id: po.id,
      productionNumber: po.productionNumber,
      completedAt: po.completedAt,
      customerName: po.customerOrder?.customerName ?? null,
      productSummary,
      quantity: totalQuantity,
      revenueKobo,
      costKobo,
      marginKobo,
      marginPct,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenueKobo,
      cost: acc.cost + r.costKobo,
      margin: acc.margin + r.marginKobo,
    }),
    { revenue: 0, cost: 0, margin: 0 },
  );
  const totalMarginPct =
    totals.revenue > 0
      ? Math.round((totals.margin / totals.revenue) * 10000) / 100
      : null;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Margin per batch"
        subtitle={`Last ${DEFAULT_WINDOW_DAYS} days · ${rows.length} completed runs`}
        action={
          <Link href="/reports" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={14} />
            All reports
          </Link>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Revenue (period)" value={formatKobo(totals.revenue)} tone="neutral" />
        <SummaryCard label="Material cost" value={formatKobo(totals.cost)} tone="neutral" />
        <SummaryCard
          label="Margin"
          value={formatKobo(totals.margin)}
          tone={totals.margin >= 0 ? 'good' : 'bad'}
        />
        <SummaryCard
          label="Margin %"
          value={totalMarginPct == null ? '—' : `${totalMarginPct.toFixed(1)}%`}
          tone={totalMarginPct == null ? 'neutral' : totalMarginPct >= 30 ? 'good' : totalMarginPct >= 10 ? 'warn' : 'bad'}
        />
      </section>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Factory size={28} className="text-slate-400" />
          <p className="text-sm font-semibold text-ink">No completed production yet</p>
          <p className="max-w-md text-xs text-slate-500">
            Margins appear here once a Production Order moves to COMPLETED. The unit-cost
            snapshot taken at completion is what we measure against the selling price.
          </p>
          <Link href="/production" className="btn-primary mt-2 text-sm">
            Go to production
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Run</th>
                <th className="px-4 py-3 font-semibold">Made</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">Material cost</th>
                <th className="px-4 py-3 text-right font-semibold">Margin</th>
                <th className="px-4 py-3 text-right font-semibold">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/production/${r.id}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">
                      {r.productionNumber}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {r.customerName ? ` · ${r.customerName}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{r.productSummary}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatKobo(r.revenueKobo)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatKobo(r.costKobo)}
                  </td>
                  <td
                    className={
                      'px-4 py-3 text-right font-bold ' +
                      (r.marginKobo >= 0 ? 'text-emerald-700' : 'text-rose-700')
                    }
                  >
                    {formatKobo(r.marginKobo)}
                  </td>
                  <td
                    className={
                      'px-4 py-3 text-right font-semibold ' +
                      (r.marginPct == null
                        ? 'text-slate-400'
                        : r.marginPct >= 30
                          ? 'text-emerald-700'
                          : r.marginPct >= 10
                            ? 'text-amber-700'
                            : 'text-rose-700')
                    }
                  >
                    {r.marginPct == null ? '—' : `${r.marginPct.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-500">
        Material cost uses the unit-cost snapshot taken when the run was marked
        COMPLETED — it doesn't drift when you later edit a raw-material price.
        Revenue is the linked Customer Order total when present, otherwise the
        product's current selling price × quantity.
      </p>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const ring =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50/60'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50/60'
        : tone === 'bad'
          ? 'border-rose-200 bg-rose-50/60'
          : 'border-border bg-white';
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${ring}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-ink">{value}</div>
    </div>
  );
}
