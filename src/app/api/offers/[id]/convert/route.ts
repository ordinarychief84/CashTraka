import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  makePublicToken,
  nextDocumentNumber,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const bodySchema = z.object({
  /// Where the offer goes:
  ///   "INVOICE" — directly to a billable invoice (with VAT/tax already
  ///               baked in from the offer line items).
  ///   "ORDER"   — to an OrderConfirmation (sales order); seller invoices
  ///               separately when they're ready.
  target: z.enum(['INVOICE', 'ORDER']).default('INVOICE'),
  dueDate: z.string().optional().or(z.literal('')),
});

/**
 * POST /api/offers/[id]/convert
 *
 * Idempotent — second call returns the existing converted target id.
 * Sets Offer.status='CONVERTED' and links the produced doc.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const offer = await prisma.offer.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: true },
  });
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const target = parsed.data.target;

  if (target === 'INVOICE' && offer.convertedInvoiceId) {
    return NextResponse.json({
      success: true,
      data: { invoiceId: offer.convertedInvoiceId, alreadyConverted: true },
    });
  }
  if (target === 'ORDER' && offer.convertedOrderConfirmationId) {
    return NextResponse.json({
      success: true,
      data: {
        orderId: offer.convertedOrderConfirmationId,
        alreadyConverted: true,
      },
    });
  }

  if (target === 'INVOICE') {
    const prefix =
      user.invoicePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';
    const invoiceNumber = await nextDocumentNumber({
      userId: user.id,
      prefix,
      table: 'invoice',
      field: 'invoiceNumber',
    });
    const publicToken = makePublicToken();
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          userId: user.id,
          customerId: offer.customerId || undefined,
          invoiceNumber,
          publicToken,
          customerName: offer.customerName,
          customerPhone: offer.customerPhone ?? '',
          customerEmail: offer.customerEmail,
          status: 'DRAFT',
          subtotal: offer.subtotal,
          tax: offer.taxAmount,
          total: offer.total,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          items: {
            create: offer.items.map((it) => ({
              productId: it.productId || null,
              description: it.description,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              itemType: 'GOODS',
            })),
          },
        },
      });
      await tx.offer.update({
        where: { id: offer.id },
        data: { status: 'CONVERTED', convertedInvoiceId: inv.id },
      });
      return inv;
    });

    documentAudit.log({
      userId: user.id,
      actorId: user.id,
      entityType: 'OFFER',
      entityId: offer.id,
      action: 'CONVERTED',
      metadata: { target: 'INVOICE', invoiceId: invoice.id },
    });
    documentAudit.archive({
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

  // target === 'ORDER'
  const prefix =
    user.orderPrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ORD';
  const orderNumber = await nextDocumentNumber({
    userId: user.id,
    prefix,
    table: 'orderConfirmation',
    field: 'orderNumber',
  });

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.orderConfirmation.create({
      data: {
        userId: user.id,
        offerId: offer.id,
        customerId: offer.customerId || undefined,
        customerName: offer.customerName,
        orderNumber,
        status: 'CONFIRMED',
        total: offer.total,
        notes: offer.notes,
      },
    });
    await tx.offer.update({
      where: { id: offer.id },
      data: { status: 'CONVERTED', convertedOrderConfirmationId: o.id },
    });
    return o;
  });

  documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'OFFER',
    entityId: offer.id,
    action: 'CONVERTED',
    metadata: { target: 'ORDER', orderId: order.id },
  });
  documentAudit.archive({
    userId: user.id,
    documentType: 'ORDER_CONFIRMATION',
    documentId: order.id,
    documentNumber: orderNumber,
  });

  return NextResponse.json({
    success: true,
    data: { orderId: order.id, orderNumber },
  });
}
