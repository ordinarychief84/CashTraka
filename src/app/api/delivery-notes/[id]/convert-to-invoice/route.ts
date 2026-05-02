import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  computeInvoiceTotals,
  makePublicToken,
  nextDocumentNumber,
  withDocumentNumberRetry,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const bodySchema = z.object({
  /// Per-line unit prices the seller fills in at conversion time. We
  /// keyed by line index because DeliveryNoteItem has no unitPrice.
  prices: z.array(z.coerce.number().int().nonnegative()),
  applyVat: z.boolean().default(false),
  vatRate: z.coerce.number().nonnegative().max(100).optional(),
  discount: z.coerce.number().int().nonnegative().default(0),
  dueDate: z.string().optional().or(z.literal('')),
  paymentTerms: z.string().trim().max(120).optional().or(z.literal('')),
});

/**
 * POST /api/delivery-notes/[id]/convert-to-invoice
 *
 * Promotes a delivery note to an invoice by applying unit prices to each
 * delivered line. Idempotent via DeliveryNote.convertedInvoiceId — a
 * second call returns the existing Invoice id.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dn = await prisma.deliveryNote.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: true },
  });
  if (!dn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (dn.convertedInvoiceId) {
    return NextResponse.json({
      success: true,
      data: { invoiceId: dn.convertedInvoiceId, alreadyConverted: true },
    });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const { prices, applyVat, discount, paymentTerms, dueDate } = parsed.data;
  if (prices.length !== dn.items.length) {
    return NextResponse.json(
      { error: 'Prices array length must match delivery note items.' },
      { status: 400 },
    );
  }

  const items = dn.items.map((it, i) => ({
    productId: it.productId,
    description: it.description,
    unitPrice: prices[i],
    quantity: it.quantity,
  }));
  const effectiveVatRate = parsed.data.vatRate ?? (applyVat ? 7.5 : 0);
  const totals = computeInvoiceTotals({
    items,
    discount,
    vatRate: effectiveVatRate,
    applyVat,
  });

  const prefix =
    user.invoicePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';
  const publicToken = makePublicToken();

  const { invoice, invoiceNumber } = await withDocumentNumberRetry(async () => {
    const invoiceNumber = await nextDocumentNumber({
      userId: user.id,
      prefix,
      table: 'invoice',
      field: 'invoiceNumber',
    });
    const inv = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          userId: user.id,
          customerId: dn.customerId || undefined,
          invoiceNumber,
          publicToken,
          customerName: dn.customerName,
          customerPhone: dn.customerPhone ?? '',
          customerEmail: null,
          status: 'DRAFT',
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          vatApplied: applyVat,
          vatRate: totals.vatRate,
          paymentTerms: paymentTerms || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          items: {
            create: items.map((it) => ({
              productId: it.productId || null,
              description: it.description,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              itemType: 'GOODS',
            })),
          },
        },
      });
      await tx.deliveryNote.update({
        where: { id: dn.id },
        data: { status: 'CONVERTED', convertedInvoiceId: created.id },
      });
      return created;
    });
    return { invoice: inv, invoiceNumber };
  });

  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'DELIVERY_NOTE',
    entityId: dn.id,
    action: 'CONVERTED',
    metadata: { invoiceId: invoice.id, invoiceNumber },
  });
  await documentAudit.archive({
    userId: user.id,
    documentType: 'INVOICE',
    documentId: invoice.id,
    documentNumber: invoiceNumber,
  });

  return NextResponse.json({
    success: true,
    data: { invoiceId: invoice.id, invoiceNumber, publicToken },
  });
}
