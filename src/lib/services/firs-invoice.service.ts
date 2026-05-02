/**
 * FIRS Invoice Service — Nigerian e-invoicing (FIRS Merchant Buyer Solution).
 *
 * Builds a compliant payload from an Invoice + InvoiceItems and delegates
 * transmission to a swappable adapter. Ships with a NoopFIRSAdapter that
 * does NOT call any external API; replace it with a real adapter once the
 * business has FIRS MBS credentials and you can verify the wire format
 * against the FIRS portal docs.
 *
 * Compliance contract — what the data model captures:
 *   - Seller: name, TIN, address (mandatory once VAT-registered)
 *   - Buyer: name, address, optional TIN (mandatory for B2B tax invoices)
 *   - Lines: itemType (GOODS|SERVICE), HS code (for goods), unit price,
 *     quantity, line total, vatExempt flag
 *   - Invoice-level: subtotal, VAT rate, VAT amount, total, currency (NGN),
 *     issued/due dates
 *
 * Once a real adapter is wired:
 *   - Real adapter calls FIRS MBS endpoint with the seller's API key.
 *   - On success, FIRS returns an IRN (Invoice Reference Number) and a QR
 *     payload that we persist on the Invoice; the IRN+QR must appear on
 *     the printed/digital invoice (tax-law requirement).
 */

import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

export type FIRSItemType = 'GOODS' | 'SERVICE';

/** What the adapter receives. Designed to mirror the FIRS MBS spec data shape. */
export type FIRSInvoicePayload = {
  // Seller (taxpayer)
  sellerName: string;
  sellerTin: string;
  sellerAddress: string;
  sellerMerchantId: string | null;
  // Buyer
  buyerName: string;
  buyerTin: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  buyerAddress: string | null;
  // Invoice-level
  invoiceNumber: string;
  invoiceDate: string; // ISO 8601
  dueDate: string | null;
  currency: string; // ISO 4217, e.g. "NGN"
  subtotal: number; // in Naira (no kobo)
  vatRate: number; // percent (e.g. 7.5)
  vatAmount: number; // in Naira
  total: number; // in Naira
  // Line items
  lines: Array<{
    description: string;
    itemType: FIRSItemType;
    hsCode: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    vatExempt: boolean;
  }>;
};

export type FIRSSubmitResult =
  | {
      ok: true;
      transmissionRef: string;
      irn: string;
      qrPayload: string;
    }
  | { ok: false; error: string; code?: string };

export type FIRSStatusResult = {
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'UNKNOWN';
  irn?: string;
  qrPayload?: string;
  acceptedAt?: Date;
  error?: string;
};

export interface FIRSInvoiceAdapter {
  submitInvoice(payload: FIRSInvoicePayload): Promise<FIRSSubmitResult>;
  checkInvoiceStatus(transmissionRef: string): Promise<FIRSStatusResult>;
}

class NoopFIRSAdapter implements FIRSInvoiceAdapter {
  async submitInvoice(): Promise<FIRSSubmitResult> {
    return {
      ok: false,
      error:
        'FIRS adapter not configured. Set FIRS_API_BASE_URL and FIRS_API_KEY environment variables, ' +
        'and provide a real FIRSInvoiceAdapter implementation that matches your FIRS MBS portal docs.',
      code: 'ADAPTER_NOT_CONFIGURED',
    };
  }
  async checkInvoiceStatus(): Promise<FIRSStatusResult> {
    return { status: 'UNKNOWN', error: 'FIRS adapter not configured.' };
  }
}

function selectAdapter(): FIRSInvoiceAdapter {
  // When implementing the real adapter, gate on env presence:
  //   if (process.env.FIRS_API_BASE_URL && process.env.FIRS_API_KEY) {
  //     return new RealFIRSAdapter({
  //       baseUrl: process.env.FIRS_API_BASE_URL!,
  //       apiKey:  process.env.FIRS_API_KEY!,
  //     });
  //   }
  return new NoopFIRSAdapter();
}

const adapter = selectAdapter();

/**
 * Validate that an invoice has the minimum required fields for a FIRS-compliant
 * submission. Rejects with a list of missing fields rather than just one, so
 * the UI can surface them all at once.
 */
export function validateFirsReadiness(invoice: {
  customerName: string;
  customerPhone: string;
  vatApplied: boolean;
  total: number;
  user: { tin: string | null; businessName: string | null; businessAddress: string | null };
}): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (!invoice.user.tin) missing.push('Seller TIN (Settings → Tax)');
  if (!invoice.user.businessName) missing.push('Business name (Settings → Profile)');
  if (!invoice.user.businessAddress) missing.push('Business address (Settings → Profile)');
  if (!invoice.customerName) missing.push('Buyer name');
  if (invoice.total <= 0) missing.push('Invoice total must be greater than zero');
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

async function loadInvoice(userId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, user: true },
  });
  if (!invoice || invoice.userId !== userId) throw Err.notFound('Invoice not found');
  return invoice;
}

function buildPayload(
  invoice: Awaited<ReturnType<typeof loadInvoice>>,
): FIRSInvoicePayload {
  return {
    sellerName: invoice.user.businessName ?? invoice.user.name ?? 'Seller',
    sellerTin: invoice.user.tin ?? '',
    sellerAddress: invoice.user.businessAddress ?? '',
    sellerMerchantId: invoice.user.firsMerchantId ?? null,
    buyerName: invoice.customerName,
    buyerTin: invoice.buyerTin,
    buyerPhone: invoice.customerPhone,
    buyerEmail: invoice.customerEmail,
    buyerAddress: invoice.buyerAddress,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.issuedAt.toISOString(),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    currency: invoice.currency || 'NGN',
    subtotal: invoice.subtotal,
    vatRate: invoice.vatRate,
    vatAmount: invoice.tax,
    total: invoice.total,
    lines: invoice.items.map((it) => ({
      description: it.description,
      itemType: (it.itemType === 'SERVICE' ? 'SERVICE' : 'GOODS') as FIRSItemType,
      hsCode: it.hsCode,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.unitPrice * it.quantity,
      vatExempt: it.vatExempt,
    })),
  };
}

export const firsInvoiceService = {
  adapter,

  async submitInvoice(userId: string, invoiceId: string) {
    const invoice = await loadInvoice(userId, invoiceId);

    const ready = validateFirsReadiness({
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      vatApplied: invoice.vatApplied,
      total: invoice.total,
      user: invoice.user,
    });
    if (!ready.ok) {
      const msg = `Cannot submit: missing ${ready.missing.join(', ')}.`;
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { firsStatus: 'FAILED', firsLastError: msg },
      });
      return { ok: false, error: msg };
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { firsStatus: 'PENDING', firsLastError: null },
    });

    const result = await adapter.submitInvoice(buildPayload(invoice));

    if (result.ok) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          firsTransmissionRef: result.transmissionRef,
          firsIrn: result.irn,
          firsQrPayload: result.qrPayload,
          firsStatus: 'SUBMITTED',
          firsSubmittedAt: new Date(),
          firsLastError: null,
        },
      });
      return { ok: true, irn: result.irn, transmissionRef: result.transmissionRef };
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { firsStatus: 'FAILED', firsLastError: result.error },
    });
    return { ok: false, error: result.error };
  },

  async checkInvoiceStatus(userId: string, invoiceId: string) {
    const invoice = await loadInvoice(userId, invoiceId);
    if (!invoice.firsTransmissionRef) {
      return {
        status: 'UNKNOWN' as const,
        error: 'Invoice has not been submitted to FIRS yet.',
      };
    }
    const result = await adapter.checkInvoiceStatus(invoice.firsTransmissionRef);
    const update: Record<string, unknown> = { firsStatus: result.status };
    if (result.status === 'ACCEPTED' && !invoice.firsAcceptedAt) {
      update.firsAcceptedAt = result.acceptedAt ?? new Date();
    }
    if (result.irn && !invoice.firsIrn) update.firsIrn = result.irn;
    if (result.qrPayload && !invoice.firsQrPayload) update.firsQrPayload = result.qrPayload;
    if (result.error) update.firsLastError = result.error;
    await prisma.invoice.update({ where: { id: invoice.id }, data: update });
    return result;
  },

  async retrySubmission(userId: string, invoiceId: string) {
    const invoice = await loadInvoice(userId, invoiceId);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { firsRetryCount: { increment: 1 }, firsStatus: 'RETRYING' },
    });
    return this.submitInvoice(userId, invoiceId);
  },
};
