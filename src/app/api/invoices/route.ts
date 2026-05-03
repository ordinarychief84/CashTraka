import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { upsertCustomer } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { requireFeature } from '@/lib/gate';
import { emailService } from '@/lib/services/email.service';
import {
  computeInvoiceTotals,
  makePublicToken,
  nextDocumentNumber,
  withDocumentNumberRetry,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';

/**
 * GET /api/invoices?q=
 *
 * Lightweight owner-scoped search used by inline pickers (e.g. the
 * bank-sync "Match to invoice" picker). Returns up to 10 invoices that
 * match the query against invoiceNumber or customerName. No `q` returns
 * the most recent 10 invoices.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();

  const where: Record<string, unknown> = { userId: user.id };
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      total: true,
      status: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ data: rows });
}

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1),
  unitPrice: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
  itemType: z.enum(['GOODS', 'SERVICE']).optional(),
  hsCode: z.string().trim().max(20).optional().or(z.literal('')),
  vatExempt: z.boolean().optional(),
});

const invoiceSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  customerPhone: z.string().trim().min(7, 'Phone is required'),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  buyerTin: z.string().trim().max(20).optional().or(z.literal('')),
  buyerAddress: z.string().trim().max(300).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  paymentTerms: z.string().trim().max(120).optional().or(z.literal('')),
  dueDate: z.string().optional(),
  /// Manual tax override (kept for backwards compatibility). When
  /// `applyVat=true`, tax is recomputed from `vatRate` and this field
  /// is ignored.
  tax: z.coerce.number().int().nonnegative().default(0),
  applyVat: z.boolean().optional(),
  vatRate: z.coerce.number().nonnegative().max(100).optional(),
  discount: z.coerce.number().int().nonnegative().default(0),
  items: z.array(itemSchema).min(1, 'Add at least one line item'),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = await requireFeature(user, 'invoices');
  if (feature) return feature;

  const body = await req.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const {
    customerName,
    customerPhone,
    customerEmail,
    buyerTin,
    buyerAddress,
    note,
    paymentTerms,
    dueDate,
    tax,
    applyVat,
    vatRate,
    discount,
    items,
  } = parsed.data;

  const normalizedPhone = normalizeNigerianPhone(customerPhone);
  const customer = await upsertCustomer(user.id, customerName, customerPhone);

  // IDOR guard: any productId supplied in a line item must belong to the
  // caller's tenant.
  const productIds = Array.from(
    new Set(items.map((it) => it.productId).filter(Boolean) as string[]),
  );
  if (productIds.length > 0) {
    const owned = await prisma.product.findMany({
      where: { id: { in: productIds }, userId: user.id },
      select: { id: true },
    });
    if (owned.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products do not exist in your catalog.' },
        { status: 400 },
      );
    }
  }

  // Resolve totals. When VAT is on, recompute tax from rate; otherwise
  // honour the manual `tax` field for full backwards compatibility.
  const vatOn = applyVat ?? user.taxEnabled ?? false;
  const effectiveVatRate = vatRate ?? (vatOn ? 7.5 : 0);
  const totals = vatOn
    ? computeInvoiceTotals({ items, discount, vatRate: effectiveVatRate, applyVat: true })
    : (() => {
        const sub = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
        const disc = Math.max(0, Math.min(discount, sub));
        return { subtotal: sub, discount: disc, tax, total: sub - disc + tax, vatRate: 0 };
      })();

  const prefix =
    user.invoicePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';

  const publicToken = makePublicToken();

  // Mint number + create in a retry loop — two concurrent requests can race
  // past `nextDocumentNumber`'s SELECT step and collide on INSERT (P2002).
  const { invoice, invoiceNumber } = await withDocumentNumberRetry(async () => {
    const invoiceNumber = await nextDocumentNumber({
      userId: user.id,
      prefix,
      table: 'invoice',
      field: 'invoiceNumber',
    });
    const created = await prisma.invoice.create({
      data: {
        userId: user.id,
        customerId: customer.id,
        invoiceNumber,
        publicToken,
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        customerEmail: customerEmail || null,
        buyerTin: buyerTin || null,
        buyerAddress: buyerAddress || null,
        status: 'DRAFT',
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        vatApplied: vatOn,
        vatRate: totals.vatRate,
        note: note || null,
        paymentTerms: paymentTerms || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: {
          create: items.map((it) => ({
            productId: it.productId || null,
            description: it.description,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            itemType: it.itemType ?? 'GOODS',
            hsCode: it.hsCode || null,
            vatExempt: it.vatExempt ?? false,
          })),
        },
      },
    });
    return { invoice: created, invoiceNumber };
  });

  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: 'CREATED',
    metadata: { invoiceNumber, total: totals.total },
  });
  await documentAudit.archive({
    userId: user.id,
    documentType: 'INVOICE',
    documentId: invoice.id,
    documentNumber: invoiceNumber,
  });

  // Optional courtesy email when the buyer has an address. Non-fatal —
  // the invoice itself is already persisted. Logged so a delivery
  // problem still leaves a trace in Vercel logs.
  if (customerEmail) {
    emailService
      .sendInvoice({
        to: customerEmail,
        customerName,
        business: user.businessName || user.name,
        invoiceNumber,
        amount: totals.total,
        dueDate: dueDate ? new Date(dueDate) : null,
        invoiceUrl: `/invoice/${publicToken}`,
      })
      .catch((e) => {
        console.warn(`[invoices.POST] courtesy invoice email failed for invoice ${invoice.id} user ${user.id}`, e);
        return null;
      });
  }

  return NextResponse.json({ id: invoice.id, invoiceNumber, publicToken });
}
