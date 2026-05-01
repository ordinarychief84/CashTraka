/**
 * NRS Invoice Service — abstraction over a future Nigerian tax-authority
 * e-invoice API. We ship a NoopAdapter that returns "not configured" until
 * NRS_API_BASE_URL + NRS_API_KEY are set; the real adapter slots in later.
 *
 * Spec contract: do not invent the NRS API surface. All real calls live in
 * the adapter; the service layer just persists state on the Invoice row.
 */

import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

export type SubmitResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

export type StatusResult = {
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'UNKNOWN';
  acceptedAt?: Date;
  error?: string;
};

export interface NRSInvoiceAdapter {
  submitInvoice(args: {
    invoiceNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    subtotal: number;
    tax: number;
    total: number;
    items: Array<{ description: string; unitPrice: number; quantity: number }>;
    issuedAt: Date;
  }): Promise<SubmitResult>;
  checkInvoiceStatus(submissionId: string): Promise<StatusResult>;
}

class NoopNRSAdapter implements NRSInvoiceAdapter {
  async submitInvoice(): Promise<SubmitResult> {
    return {
      ok: false,
      error:
        'NRS adapter not configured. Set NRS_API_BASE_URL and NRS_API_KEY environment variables to enable submissions.',
    };
  }
  async checkInvoiceStatus(): Promise<StatusResult> {
    return {
      status: 'UNKNOWN',
      error: 'NRS adapter not configured.',
    };
  }
}

function selectAdapter(): NRSInvoiceAdapter {
  // When a real adapter is implemented, gate it on env presence:
  //   if (process.env.NRS_API_BASE_URL && process.env.NRS_API_KEY) return new RealNRSAdapter();
  return new NoopNRSAdapter();
}

const adapter = selectAdapter();

async function loadInvoice(userId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });
  if (!invoice || invoice.userId !== userId) throw Err.notFound('Invoice not found');
  return invoice;
}

export const nrsInvoiceService = {
  adapter,

  async submitInvoice(userId: string, invoiceId: string) {
    const invoice = await loadInvoice(userId, invoiceId);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { nrsStatus: 'PENDING', nrsLastError: null },
    });

    const result = await adapter.submitInvoice({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      items: invoice.items.map((i) => ({
        description: i.description,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      issuedAt: invoice.issuedAt,
    });

    if (result.ok) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          nrsSubmissionId: result.submissionId,
          nrsStatus: 'SUBMITTED',
          nrsSubmittedAt: new Date(),
          nrsLastError: null,
        },
      });
      return { ok: true, submissionId: result.submissionId };
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { nrsStatus: 'FAILED', nrsLastError: result.error },
    });
    return { ok: false, error: result.error };
  },

  async checkInvoiceStatus(userId: string, invoiceId: string) {
    const invoice = await loadInvoice(userId, invoiceId);
    if (!invoice.nrsSubmissionId) {
      return { status: 'UNKNOWN' as const, error: 'Invoice has not been submitted yet.' };
    }
    const result = await adapter.checkInvoiceStatus(invoice.nrsSubmissionId);
    const update: Record<string, unknown> = { nrsStatus: result.status };
    if (result.status === 'ACCEPTED' && !invoice.nrsAcceptedAt) {
      update.nrsAcceptedAt = result.acceptedAt ?? new Date();
    }
    if (result.error) update.nrsLastError = result.error;
    await prisma.invoice.update({ where: { id: invoice.id }, data: update });
    return result;
  },

  async retrySubmission(userId: string, invoiceId: string) {
    const invoice = await loadInvoice(userId, invoiceId);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { nrsRetryCount: { increment: 1 }, nrsStatus: 'RETRYING' },
    });
    return this.submitInvoice(userId, invoiceId);
  },
};
