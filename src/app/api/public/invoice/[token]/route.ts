import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { effectiveInvoiceStatus } from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

/**
 * GET /api/public/invoice/[token]
 *
 * Public, no-auth read of a single invoice by its non-guessable
 * publicToken. Returns ONLY safe fields — never internal IDs of
 * unrelated rows, never the seller's internal user id, etc.
 *
 * Side effect: the first time the invoice is fetched here we set
 * Invoice.viewedAt and write an audit log entry. Subsequent fetches
 * are read-only.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
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
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // First-view side effect (idempotent).
  if (!invoice.viewedAt) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        viewedAt: new Date(),
        // Lift status from SENT -> VIEWED if it was just sent.
        status: invoice.status === 'SENT' ? 'VIEWED' : invoice.status,
      },
    });
    documentAudit.log({
      userId: invoice.userId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'VIEWED',
    });
  }

  const status = effectiveInvoiceStatus(invoice);
  const outstanding = Math.max(0, invoice.total - invoice.amountPaid);

  return NextResponse.json({
    success: true,
    data: {
      invoiceNumber: invoice.invoiceNumber,
      status,
      issuedAt: invoice.issuedAt.toISOString(),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      vatRate: invoice.vatRate,
      vatApplied: invoice.vatApplied,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      outstanding,
      note: invoice.note,
      paymentTerms: invoice.paymentTerms,
      // Buyer view: customer details
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      buyerTin: invoice.buyerTin,
      buyerAddress: invoice.buyerAddress,
      // Seller branding
      seller: {
        name: invoice.user.businessName || invoice.user.name || 'Seller',
        address: invoice.user.businessAddress,
        whatsapp: invoice.user.whatsappNumber,
        logoUrl: invoice.user.logoUrl,
        tin: invoice.user.tin,
        accentColor: invoice.user.invoiceAccentColor || '#00B8E8',
        paymentInstructions: invoice.user.paymentInstructions,
        bank: invoice.user.bankAccountNumber
          ? {
              name: invoice.user.bankName,
              accountNumber: invoice.user.bankAccountNumber,
              accountName: invoice.user.bankAccountName,
            }
          : null,
      },
      items: invoice.items.map((i) => ({
        description: i.description,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      // Surface the cuid id for the public-pay flow (used as Paystack reference).
      // It is needed for /api/invoices/[id]/pay; not sensitive on its own.
      payInvoiceId: invoice.id,
    },
  });
}
