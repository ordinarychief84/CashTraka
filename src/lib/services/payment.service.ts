import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { paymentSchema } from '@/lib/validators';
import { upsertCustomer, recomputeCustomerTotals } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { generateRefCode } from '@/lib/ref-code';
import { paymentRepo } from '@/lib/repositories/payment.repository';
import { receiptService } from './receipt.service';

/** Generate a reference code that doesn't collide with an existing one. */
async function uniqueRefCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateRefCode();
    const existing = await prisma.payment.findUnique({ where: { referenceCode: code } });
    if (!existing) return code;
  }
  return generateRefCode() + '-' + Date.now().toString(36).slice(-4).toUpperCase();
}

export const paymentService = {
  listForUser: async (userId: string, opts?: { status?: 'PAID' | 'PENDING'; take?: number; skip?: number }) => {
    const take = opts?.take ?? 50;
    const skip = opts?.skip ?? 0;
    const where = { userId, ...(opts?.status ? { status: opts.status } : {}) };
    const [rows, total] = await Promise.all([
      paymentRepo.list(where, take, skip),
      paymentRepo.count(where),
    ]);
    return { rows, total };
  },

  getForUser: async (userId: string, id: string) => {
    const payment = await paymentRepo.byId(id);
    if (!payment || payment.userId !== userId) throw Err.notFound('Payment not found');
    return payment;
  },

  /**
   * Create a payment. Upserts the customer, optionally decrements product stock
   * if line items reference catalog products, and returns the new payment id.
   *
   * If the payment is created as PAID, a receipt is auto-generated so the
   * owner can share it immediately. Verification (bank-alert matching) is
   * separate — it also generates a receipt if one doesn't yet exist.
   */
  create: async (userId: string, input: unknown) => {
    const parsed = paymentSchema.parse(input);
    const { customerName, phone, amount, status, items = [] } = parsed;
    const normalizedPhone = normalizeNigerianPhone(phone);
    const customer = await upsertCustomer(userId, customerName, phone);

    const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean) as string[]));
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds }, userId } })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const referenceCode = await uniqueRefCode();

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId,
          customerId: customer.id,
          customerNameSnapshot: customerName.trim(),
          phoneSnapshot: normalizedPhone,
          amount,
          status,
          referenceCode,
          items: items.length
            ? {
                create: items.map((it) => ({
                  productId: it.productId || null,
                  description: it.description,
                  unitPrice: it.unitPrice,
                  quantity: it.quantity,
                })),
              }
            : undefined,
        },
      });
      for (const it of items) {
        if (!it.productId) continue;
        const prod = productMap.get(it.productId);
        if (!prod || !prod.trackStock) continue;
        await tx.product.update({
          where: { id: prod.id },
          data: { stock: { decrement: it.quantity } },
        });
      }
      return created;
    });

    await recomputeCustomerTotals(customer.id);

    // Auto-generate a receipt for PAID payments. Fire and forget — never let
    // receipt gen (which touches Cloudinary) block payment creation.
    let receiptId: string | null = null;
    let receiptNumber: string | null = null;
    if (payment.status === 'PAID') {
      try {
        const receipt = await receiptService.ensureForPayment(userId, payment.id);
        receiptId = receipt.id;
        receiptNumber = receipt.receiptNumber;
      } catch {
        // Swallow — the owner can always click "Generate receipt" from the list.
      }
    }

    return { id: payment.id, referenceCode, receiptId, receiptNumber };
  },
};
