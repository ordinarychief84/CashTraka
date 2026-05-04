import Link from 'next/link';
import { ExternalLink, Download, MessageCircle, Plus } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatKobo, formatDateTime } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

type SP = {
  q?: string;
  source?: string;
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  PAYSTACK: 'Paystack',
  PROMISE: 'Promise',
  INSTALLMENT: 'Installment',
  DEBT: 'Debt cleared',
  CATALOG: 'Catalog',
};

export default async function ReceiptsPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const q = (searchParams.q || '').trim();
  const source = (searchParams.source || 'ALL').toUpperCase();

  const where: Record<string, unknown> = { userId: user.id };
  if (source !== 'ALL') where.source = source;
  if (q) {
    (where as { OR: unknown[] }).OR = [
      { receiptNumber: { contains: q, mode: 'insensitive' } },
    ];
  }

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { businessName: true, name: true } },
    },
  });

  // Hydrate customer + amount from the linked payment/debt for each row.
  const paymentIds = receipts.map((r) => r.paymentId).filter(Boolean) as string[];
  const debtIds = receipts.map((r) => r.debtId).filter(Boolean) as string[];
  const [payments, debts] = await Promise.all([
    paymentIds.length
      ? prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          select: { id: true, amountKobo: true, customerNameSnapshot: true, phoneSnapshot: true },
        })
      : Promise.resolve([]),
    debtIds.length
      ? prisma.debt.findMany({
          where: { id: { in: debtIds } },
          select: { id: true, amountOwedKobo: true, amountPaidKobo: true, customerNameSnapshot: true, phoneSnapshot: true },
        })
      : Promise.resolve([]),
  ]);
  const paymentMap = new Map(payments.map((p) => [p.id, p]));
  const debtMap = new Map(debts.map((d) => [d.id, d]));

  // Filter by name/phone after hydration when q is set.
  const rows = receipts
    .map((r) => {
      const p = r.paymentId ? paymentMap.get(r.paymentId) : null;
      const d = r.debtId ? debtMap.get(r.debtId) : null;
      const customerName = p?.customerNameSnapshot ?? d?.customerNameSnapshot ?? 'Customer';
      const phone = p?.phoneSnapshot ?? d?.phoneSnapshot ?? '';
      const amount = p?.amountKobo ?? d?.amountPaidKobo ?? d?.amountOwedKobo ?? 0;
      return { receipt: r, customerName, phone, amount };
    })
    .filter((row) => {
      if (!q) return true;
      const lower = q.toLowerCase();
      const digits = q.replace(/\D/g, '');
      return (
        row.receipt.receiptNumber.toLowerCase().includes(lower) ||
        row.customerName.toLowerCase().includes(lower) ||
        (digits && row.phone.includes(digits))
      );
    });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Receipts"
        subtitle="Every receipt you've issued. Tap one to view, share, or download."
        action={
          <Link
            href="/receipts/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} /> New receipt
          </Link>
        }
      />

      {/* Source filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SourceLink current={source} value="ALL" label="All" q={q} />
        {Object.entries(SOURCE_LABEL).map(([v, lbl]) => (
          <SourceLink key={v} current={source} value={v} label={lbl} q={q} />
        ))}
      </div>

      {/* Search */}
      <form className="mb-4" action="/receipts">
        <input type="hidden" name="source" value={source === 'ALL' ? '' : source} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by receipt number, customer name, or phone"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No receipts yet"
          description="Receipts auto-generate when a payment is confirmed. Record a payment to see one here."
          actionHref="/payments/new"
          actionLabel="Record a payment"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Receipt</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ receipt, customerName, phone, amount }) => (
                <tr key={receipt.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/receipts/${receipt.id}`} className="font-mono text-xs text-brand-600 hover:underline">
                      {receipt.receiptNumber}
                    </Link>
                    {receipt.balanceRemainingKobo && receipt.balanceRemainingKobo > 0 ? (
                      <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Partial
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{customerName}</div>
                    {phone ? (
                      <div className="text-xs text-slate-500">{displayPhone(phone)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {SOURCE_LABEL[receipt.source] ?? receipt.source}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{formatDateTime(receipt.createdAt)}</td>
                  <td className="num px-4 py-2.5 text-right font-semibold">{formatKobo(amount)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/r/${receipt.id}`}
                        target="_blank"
                        title="Open public receipt"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <a
                        href={`/api/receipts/${receipt.id}`}
                        download
                        title="Download PDF"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Download size={14} />
                      </a>
                      <Link
                        href={`/receipts/${receipt.id}`}
                        title="Share via WhatsApp"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#25D366]"
                      >
                        <MessageCircle size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function SourceLink({ current, value, label, q }: { current: string; value: string; label: string; q: string }) {
  const isActive = current === value;
  const search = new URLSearchParams();
  if (value !== 'ALL') search.set('source', value);
  if (q) search.set('q', q);
  const href = `/receipts${search.toString() ? `?${search.toString()}` : ''}`;
  return (
    <Link
      href={href}
      className={
        isActive
          ? 'rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white'
          : 'rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-500'
      }
    >
      {label}
    </Link>
  );
}
