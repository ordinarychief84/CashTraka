import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, validationFail } from '@/lib/api-response';
import { upsertCustomer } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { receiptService } from '@/lib/services/receipt.service';
import { nextInvoiceNumber } from '@/lib/invoice-number';
import { nairaToKobo } from '@/lib/money';

export const runtime = 'nodejs';

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Item description is required').max(120),
  unitPrice: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
});

const bodySchema = z
  .object({
    customerName: z.string().trim().min(1, 'Customer name is required').max(120),
    phone: z.string().trim().max(30).optional(),
    items: z.array(itemSchema).min(1, 'Add at least one item'),
    /// Apply VAT? Defaults to the seller's profile setting on the client side.
    /// Server respects whatever the client sends; the seller is in control.
    applyVat: z.boolean().default(false),
    /// VAT rate (percent). When omitted but applyVat=true, falls back to the
    /// seller's User.vatRate.
    vatRate: z.coerce.number().min(0).max(50).optional(),
    /// Optional buyer details for the tax invoice (B2B).
    buyerTin: z.string().trim().max(20).optional(),
    buyerEmail: z.string().email().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.items.every((i) => i.unitPrice > 0), {
    message: 'All items must have a unit price greater than zero',
    path: ['items'],
  });

/**
 * POST /api/receipts/manual
 *
 * Manual sales-order entry that produces a full set of records:
 *   1. Payment (status=PAID)               -> the money trail
 *   2. Receipt (auto via receiptService)   -> what the customer gets
 *   3. Invoice (only when applyVat=true)   -> the tax document linked back
 *      to the Payment via Invoice.paymentId, ready for FIRS submission
 *
 * Why this shape:
 *   - Receipts are payment confirmations; they always need to exist.
 *   - The Invoice is the FIRS-eligible tax document. Per Nigerian tax law,
 *     when VAT is charged we must issue a tax invoice with the seller's TIN
 *     and the line-item breakdown. Linking it to the Payment gives the
 *     /invoices/[id] page everything it needs to submit to FIRS MBS.
 *   - The Receipt PDF reads through to the linked Invoice (when one exists)
 *     to show the VAT line, so the customer's receipt is also tax-correct.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const seller = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        vatRegistered: true,
        vatRate: true,
        tin: true,
      },
    });

    const subtotal = parsed.data.items.reduce(
      (s, it) => s + it.unitPrice * it.quantity,
      0,
    );

    // Resolve VAT rate. Seller decides whether to apply on this receipt.
    // When they say "apply" but no rate is provided, fall back to user.vatRate
    // (default 7.5%).
    const applyVat = parsed.data.applyVat;
    const vatRate = applyVat
      ? parsed.data.vatRate ?? seller?.vatRate ?? 7.5
      : 0;
    const vatAmount = applyVat ? Math.round((subtotal * vatRate) / 100) : 0;
    const total = subtotal + vatAmount;

    // Customer (snapshot pattern matches paymentService.create).
    const phone = parsed.data.phone?.trim() || '0000000000';
    const normalizedPhone = normalizeNigerianPhone(phone);
    const customer = await upsertCustomer(user.id, parsed.data.customerName, phone);

    // Create the Payment + items in a single transaction, then the Invoice
    // (when applicable) outside the transaction so a Prisma write to the
    // Invoice table cannot lock the Payment row.
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        customerId: customer.id,
        customerNameSnapshot: parsed.data.customerName.trim(),
        phoneSnapshot: normalizedPhone,
        amount: total,
        amountKobo: nairaToKobo(total),
        status: 'PAID',
        verified: true,
        verifiedAt: new Date(),
        verificationMethod: 'MANUAL',
        items: {
          create: parsed.data.items.map((it) => ({
            description: it.description,
            unitPrice: it.unitPrice,
            unitPriceKobo: nairaToKobo(it.unitPrice),
            quantity: it.quantity,
          })),
        },
      },
    });

    // Auto-generate the Receipt row. Idempotent.
    const receipt = await receiptService.ensureForPayment(user.id, payment.id, {
      source: 'MANUAL',
    });

    // When VAT applies, also generate the tax Invoice so it's ready for FIRS
    // submission from /invoices/[id].
    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;
    if (applyVat) {
      const number = await nextInvoiceNumber(user.id);
      const invoice = await prisma.invoice.create({
        data: {
          userId: user.id,
          customerId: customer.id,
          invoiceNumber: number,
          customerName: parsed.data.customerName.trim(),
          customerPhone: normalizedPhone,
          customerEmail: parsed.data.buyerEmail ?? null,
          buyerTin: parsed.data.buyerTin ?? null,
          status: 'PAID',
          subtotal,
          tax: vatAmount,
          total,
          subtotalKobo: nairaToKobo(subtotal),
          taxKobo: nairaToKobo(vatAmount),
          totalKobo: nairaToKobo(total),
          vatApplied: true,
          vatRate,
          currency: 'NGN',
          note: parsed.data.note ?? null,
          paidAt: new Date(),
          paymentId: payment.id,
          items: {
            create: parsed.data.items.map((it) => ({
              description: it.description,
              unitPrice: it.unitPrice,
              unitPriceKobo: nairaToKobo(it.unitPrice),
              quantity: it.quantity,
              itemType: 'GOODS',
            })),
          },
        },
      });
      invoiceId = invoice.id;
      invoiceNumber = invoice.invoiceNumber;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: payment.id,
          receiptId: receipt.id,
          receiptNumber: receipt.receiptNumber,
          invoiceId,
          invoiceNumber,
          subtotal,
          vatAmount,
          total,
          applyVat,
          vatRate,
        },
      },
      { status: 201 },
    );
  });
