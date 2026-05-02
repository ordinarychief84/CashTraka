import { notFound } from 'next/navigation';
import { Download, Lock, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { prisma } from '@/lib/prisma';
import { effectiveInvoiceStatus } from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';
import { displayPhone, waLink } from '@/lib/whatsapp';
import { formatNaira, formatDate } from '@/lib/format';
import { PublicInvoicePay } from '@/components/invoices/PublicInvoicePay';

export const dynamic = 'force-dynamic';

/**
 * Compute relative luminance of a hex color (0..1). Used to pick a
 * readable foreground for buttons whose background is the user's
 * configured accent - pale accents like sky-blue lose white text.
 */
function relativeLuminance(hex: string): number {
  const m = /^#?([\da-f]{6}|[\da-f]{3})$/i.exec(hex.trim());
  if (!m) return 0;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function readableOn(bg: string): string {
  return relativeLuminance(bg) > 0.6 ? '#0a0a0a' : '#ffffff';
}

const STATUS_TONE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-700' },
  SENT: { label: 'Sent', cls: 'bg-brand-50 text-brand-700' },
  VIEWED: { label: 'Viewed', cls: 'bg-brand-50 text-brand-700' },
  PARTIALLY_PAID: { label: 'Partially paid', cls: 'bg-amber-50 text-amber-700' },
  PAID: { label: 'Paid', cls: 'bg-success-50 text-success-700' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-50 text-red-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' },
  CREDITED: { label: 'Credited', cls: 'bg-slate-100 text-slate-500' },
};

/**
 * Public invoice page. No login required. Customers reach this from the
 * link the seller shares on WhatsApp/email. Renders branded summary,
 * optional PDF download, and a Pay button when Paystack is configured.
 *
 * SECURITY:
 *   - Token is non-guessable (24-byte base64url, ~192 bits of entropy).
 *   - Only safe fields are exposed (no internal user id, no other rows).
 *   - First view writes Invoice.viewedAt and an audit row.
 */
export default async function PublicInvoicePage({
  params,
}: {
  params: { token: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: params.token },
    include: {
      items: true,
      user: {
        select: {
          name: true,
          businessName: true,
          businessAddress: true,
          whatsappNumber: true,
          logoUrl: true,
          tin: true,
          paymentInstructions: true,
          invoiceAccentColor: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
    },
  });
  if (!invoice) notFound();

  // First-view side effect (idempotent).
  if (!invoice.viewedAt) {
    await prisma.invoice
      .update({
        where: { id: invoice.id },
        data: {
          viewedAt: new Date(),
          status: invoice.status === 'SENT' ? 'VIEWED' : invoice.status,
        },
      })
      .catch(() => null);
    documentAudit.log({
      userId: invoice.userId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'VIEWED',
    });
  }

  const status = effectiveInvoiceStatus(invoice);
  const tone = STATUS_TONE[status] ?? STATUS_TONE.DRAFT;
  const outstanding = Math.max(0, invoice.total - invoice.amountPaid);
  const business =
    invoice.user.businessName || invoice.user.name || 'Seller';
  const accent = invoice.user.invoiceAccentColor || '#00B8E8';
  const accentFg = readableOn(accent);

  // Pay-on-WhatsApp prefilled message back to the seller (asks for help).
  const helpMessage =
    `Hi ${business}, I'm looking at invoice ${invoice.invoiceNumber} ` +
    `for ${formatNaira(invoice.total)}. ` +
    `Could you confirm payment details?`;

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
          {/* Branded header */}
          <div
            className="px-5 py-5 sm:px-7"
            style={{ background: accent, color: accentFg }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {invoice.user.logoUrl ? (
                  <img
                    src={invoice.user.logoUrl}
                    alt={business}
                    className="mb-2 h-10 w-10 rounded-md bg-white object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <div className="text-lg font-bold">{business}</div>
                {invoice.user.businessAddress ? (
                  <div className="text-xs opacity-90">
                    {invoice.user.businessAddress}
                  </div>
                ) : null}
                {invoice.user.tin ? (
                  <div className="mt-1 inline-flex rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                    TIN {invoice.user.tin}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide opacity-80">
                  {invoice.user.tin ? 'Tax invoice' : 'Invoice'}
                </div>
                <div className="font-mono text-sm font-bold">
                  {invoice.invoiceNumber}
                </div>
                <div
                  className={
                    'mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                    tone.cls
                  }
                >
                  {tone.label}
                </div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm sm:px-7">
            <Field label="Billed to" value={invoice.customerName} />
            <Field label="Issued" value={formatDate(invoice.issuedAt)} />
            {invoice.customerEmail ? (
              <Field label="Email" value={invoice.customerEmail} />
            ) : null}
            {invoice.dueDate ? (
              <Field label="Due" value={formatDate(invoice.dueDate)} />
            ) : null}
            {invoice.buyerTin ? (
              <Field label="Buyer TIN" value={invoice.buyerTin} mono />
            ) : null}
            {invoice.buyerAddress ? (
              <Field label="Address" value={invoice.buyerAddress} />
            ) : null}
            <Field label="Currency" value={invoice.currency} />
          </div>

          {/* Items */}
          {invoice.items.length > 0 ? (
            <div className="border-t border-border px-5 py-4 sm:px-7">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Items
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-1.5 pr-2 text-ink">{it.description}</td>
                      <td className="py-1.5 text-center text-slate-600">×{it.quantity}</td>
                      <td className="num py-1.5 text-right text-slate-700">
                        {formatNaira(it.unitPrice)}
                      </td>
                      <td className="num py-1.5 text-right font-semibold text-ink">
                        {formatNaira(it.unitPrice * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Totals */}
          <div className="border-t border-border px-5 py-4 text-sm sm:px-7">
            <Row label="Subtotal" value={formatNaira(invoice.subtotal)} />
            {invoice.discount > 0 ? (
              <Row label="Discount" value={`- ${formatNaira(invoice.discount)}`} />
            ) : null}
            {invoice.vatApplied || invoice.tax > 0 ? (
              <Row label={`VAT (${invoice.vatRate}%)`} value={formatNaira(invoice.tax)} />
            ) : null}
            {invoice.amountPaid > 0 ? (
              <Row label="Paid so far" value={formatNaira(invoice.amountPaid)} />
            ) : null}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold uppercase tracking-wide text-slate-500">
                {outstanding > 0 ? 'Amount due' : 'Total'}
              </span>
              <span className="num text-2xl font-bold text-ink">
                {formatNaira(outstanding > 0 ? outstanding : invoice.total)}
              </span>
            </div>
          </div>

          {/* Bank/Payment instructions */}
          {invoice.user.paymentInstructions ||
          invoice.user.bankAccountNumber ? (
            <div className="border-t border-border bg-slate-50 px-5 py-4 text-sm sm:px-7">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Payment instructions
              </div>
              {invoice.user.paymentInstructions ? (
                <p className="whitespace-pre-line text-slate-700">
                  {invoice.user.paymentInstructions}
                </p>
              ) : null}
              {invoice.user.bankAccountNumber ? (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <Field label="Bank" value={invoice.user.bankName ?? '-'} />
                  <Field
                    label="Account"
                    value={invoice.user.bankAccountNumber}
                    mono
                  />
                  {invoice.user.bankAccountName ? (
                    <Field
                      label="Account name"
                      value={invoice.user.bankAccountName}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Actions */}
          <div className="border-t border-border px-5 py-4 sm:px-7">
            {outstanding > 0 && status !== 'CANCELLED' && status !== 'CREDITED' ? (
              <PublicInvoicePay
                invoiceId={invoice.id}
                token={invoice.publicToken ?? params.token}
                outstanding={outstanding}
                accentColor={accent}
                accentFg={accentFg}
              />
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={`/api/invoices/${invoice.id}/pdf?token=${invoice.publicToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500"
              >
                <Download size={13} />
                Download PDF
              </a>
              {invoice.user.whatsappNumber ? (
                <a
                  href={waLink(invoice.user.whatsappNumber, helpMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1fbd5b]"
                >
                  <MessageCircle size={13} />
                  Message seller
                </a>
              ) : null}
            </div>
          </div>

          {invoice.note ? (
            <div className="border-t border-border bg-slate-50 px-5 py-3 text-xs text-slate-600 sm:px-7">
              <span className="font-semibold">Note: </span>
              {invoice.note}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Lock size={11} /> Private invoice link
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Logo size="sm" />
          <span>Powered by CashTraka</span>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={
          mono ? 'mt-0.5 font-mono text-sm text-ink' : 'mt-0.5 text-sm text-ink'
        }
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="num font-semibold text-ink">{value}</span>
    </div>
  );
}
