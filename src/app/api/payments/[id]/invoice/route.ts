import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, validationFail } from '@/lib/api-response';
import { Err } from '@/lib/errors';
import { nextInvoiceNumber } from '@/lib/invoice-number';

export const runtime = 'nodejs';

const bodySchema = z.object({
  taxRate: z.coerce.number().min(0).max(100).optional(),
  customerEmail: z.string().email().optional(),
  note: z.string().trim().max(2000).optional(),
  dueDate: z.string().optional(),
});

/**
 * POST /api/payments/[id]/invoice — generate an Invoice from a Payment.
 * Idempotent: re-running for the same payment returns the existing invoice
 * (enforced by the unique Invoice.paymentId constraint).
 */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();

    const payment = await prisma.payment.findFirst({
      where: { id: ctx.params.id, userId: user.id },
      include: { items: true },
    });
    if (!payment) throw Err.notFound('Payment not found');

    // Idempotency check — return existing invoice if one is already linked.
    const existing = await prisma.invoice.findUnique({ where: { paymentId: payment.id } });
    if (existing) {
      return ok({
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        status: existing.status,
        idempotent: true,
      });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const taxRate = parsed.data.taxRate ?? 0;
    const subtotal =
      payment.items.length > 0
        ? payment.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
        : payment.amount;
    const tax = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + tax;

    const invoiceNumber = await nextInvoiceNumber(user.id);

    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        customerId: payment.customerId || null,
        invoiceNumber,
        customerName: payment.customerNameSnapshot,
        customerPhone: payment.phoneSnapshot,
        customerEmail: parsed.data.customerEmail ?? null,
        status: payment.status === 'PAID' ? 'PAID' : 'SENT',
        subtotal,
        tax,
        total,
        note: parsed.data.note ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        paidAt: payment.status === 'PAID' ? new Date() : null,
        paymentId: payment.id,
        items:
          payment.items.length > 0
            ? {
                create: payment.items.map((it) => ({
                  productId: it.productId ?? null,
                  description: it.description,
                  unitPrice: it.unitPrice,
                  quantity: it.quantity,
                })),
              }
            : {
                create: [
                  {
                    description: 'Payment received',
                    unitPrice: payment.amount,
                    quantity: 1,
                  },
                ],
              },
      },
    });

    return NextResponse.json(
      { success: true, data: { id: invoice.id, invoiceNumber: invoice.invoiceNumber } },
      { status: 201 },
    );
  });
