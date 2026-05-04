import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { InvoiceDoc, type InvoiceData } from '@/lib/pdf-docs';
import { displayPhone } from '@/lib/whatsapp';
import { accessAuditService } from '@/lib/services/access-audit.service';

export const runtime = 'nodejs';

/**
 * GET /api/invoices/[id]/pdf → streams a PDF of the invoice.
 *
 * Two access modes:
 *   1. Authenticated seller — session cookie + ownership check.
 *   2. Public — `?token=<publicToken>` matches Invoice.publicToken.
 *
 * Only accepts the cuid `id`, NOT the sequential invoiceNumber.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const publicToken = url.searchParams.get('token');

  let invoice;
  let auth: Awaited<ReturnType<typeof getAuthContext>> = null;
  if (publicToken && publicToken.length >= 16) {
    invoice = await prisma.invoice.findFirst({
      where: { id: params.id, publicToken },
      include: {
        user: {
          select: {
            name: true,
            businessName: true,
            businessAddress: true,
            whatsappNumber: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
            tin: true,
          },
        },
        items: true,
      },
    });
  } else {
    auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: auth.owner.id },
      include: {
        user: {
          select: {
            name: true,
            businessName: true,
            businessAddress: true,
            whatsappNumber: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
            tin: true,
          },
        },
        items: true,
      },
    });
  }
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Tax+ access audit: log non-owner reads of an invoice PDF.
  if (auth && !auth.isOwner) {
    try {
      await accessAuditService.recordRead({
        actorId: auth.principalId,
        userId: auth.owner.id,
        entityType: 'INVOICE',
        entityId: invoice.id,
        action: 'READ_INVOICE',
        metadata: { role: auth.accessRole, invoiceNumber: invoice.invoiceNumber },
      });
    } catch {}
  }

  // Render the FIRS QR code (if we have an IRN payload from a successful
  // submission). Fall back to undefined if QR generation fails — the rest of
  // the PDF still renders.
  let firsQrDataUrl: string | null = null;
  if (invoice.firsQrPayload) {
    try {
      firsQrDataUrl = await QRCode.toDataURL(invoice.firsQrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
      });
    } catch {
      firsQrDataUrl = null;
    }
  }

  const data: InvoiceData = {
    business: invoice.user.businessName || invoice.user.name || 'Seller',
    businessAddress: invoice.user.businessAddress,
    whatsappNumber: invoice.user.whatsappNumber
      ? displayPhone(invoice.user.whatsappNumber)
      : null,
    tin: invoice.user.tin,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    customerName: invoice.customerName,
    customerPhone: displayPhone(invoice.customerPhone),
    customerEmail: invoice.customerEmail,
    buyerTin: invoice.buyerTin,
    buyerAddress: invoice.buyerAddress,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    // PDF expects kobo per Phase 6 read-flip. The InvoiceData field names
    // (subtotal/tax/total/unitPrice) are unchanged; the values are now kobo.
    subtotal: invoice.subtotalKobo,
    tax: invoice.taxKobo,
    vatRate: invoice.vatApplied ? invoice.vatRate : null,
    total: invoice.totalKobo,
    note: invoice.note,
    items: invoice.items.map((i) => ({
      description: i.description,
      unitPrice: i.unitPriceKobo,
      quantity: i.quantity,
      itemType: i.itemType === 'SERVICE' ? 'SERVICE' : 'GOODS',
      hsCode: i.hsCode,
      vatExempt: i.vatExempt,
    })),
    bank: {
      name: invoice.user.bankName,
      accountNumber: invoice.user.bankAccountNumber,
      accountName: invoice.user.bankAccountName,
    },
    firsIrn: invoice.firsIrn,
    firsQrDataUrl,
  };

  const buffer = await renderToBuffer(InvoiceDoc({ data }));
  const filename = `invoice-${invoice.invoiceNumber}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
