import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { upsertCustomer } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { nextInvoiceNumber } from '@/lib/invoice-number';
import { requireFeature } from '@/lib/gate';
import { emailService } from '@/lib/services/email.service';

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1),
  unitPrice: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
});

const invoiceSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  customerPhone: z.string().trim().min(7, 'Phone is required'),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  dueDate: z.string().optional(),
  tax: z.coerce.number().int().nonnegative().default(0),
  items: z.array(itemSchema).min(1, 'Add at least one line item'),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = requireFeature(user, 'invoices');
  if (feature) return feature;

  const body = await req.json();
  const parsed = invoiceSchema.safeParse(body);
  if (\!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { customerName, customerPhone, customerEmail, note, dueDate, tax, items } = parsed.data;

  const normalizedPhone = normalizeNigerianPhone(customerPhone);
  const customer = await upsertCustomer(user.id, customerName, customerPhone);
  const invoiceNumber = await nextInvoiceNumber(user.id);

  // IDOR guard: any productId supplied in a line item must belong to the
  // caller's tenant. Without this, an attacker can link invoice lines to a
  // different tenant's product and leak its name via the invoice record.
  const productIds = Array.from(
    new Set(items.map((it) => it.productId).filter(Boolean) as string[]),
  );
  if (productIds.length > 0) {
    const owned = await prisma.product.findMany({
      where: { id: { in: productIds }, userId: user.id },
      select: { id: true },
    });
    if (owned.length \!== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products do not exist in your catalog.' },
        { status: 400 },
      );
    }
  }

  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const total = subtotal + tax;

  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      customerId: customer.id,
      invoiceNumber,
      customerName: customerName.trim(),
      customerPhone: normalizedPhone,
      customerEmail: customerEmail || null,
      status: 'DRAFT',
      subtotal,
      tax,
      total,
      note: note || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      items: {
        create: items.map((it) => ({
          productId: it.productId || null,
          description: it.description,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
        })),
      },
    },
  });

  // Send invoice email if customer has an email address
  if (customerEmail) {
    emailService
      .sendInvoice({
        to: customerEmail,
        customerName,
        business: user.businessName || user.name,
        invoiceNumber,
        amount: total,
        dueDate: dueDate ? new Date(dueDate) : null,
        invoiceUrl: `/invoice/${invoiceNumber}`,
      })
      .catch(() => null);
  }

  return NextResponse.json({ id: invoice.id, invoiceNumber });
}
