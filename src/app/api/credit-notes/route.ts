import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { nextDocumentNumber, makePublicToken } from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const bodySchema = z.object({
  invoiceId: z.string().min(1),
  /// Optional partial credit. Defaults to the invoice's current total.
  /// Always clamped to [0, invoice.total - alreadyCredited] in the service.
  amount: z.coerce.number().int().nonnegative().optional(),
  reason: z.string().trim().max(500).optional(),
});

/**
 * GET  /api/credit-notes → list the current business's credit notes.
 * POST /api/credit-notes → reverse part or all of an invoice.
 *
 * Issuing a credit note for the full outstanding total flips the source
 * Invoice to CREDITED. A partial credit note leaves the invoice in its
 * previous status but reduces effective amount due (we keep the original
 * `total` intact and infer "credited" via summing CreditNote.total).
 */
export async function GET(_req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.creditNote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      invoice: {
        select: { invoiceNumber: true, total: true, customerName: true },
      },
    },
  });
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.data.invoiceId, userId: user.id },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      tax: true,
      subtotal: true,
      vatRate: true,
      vatApplied: true,
      status: true,
    },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  // Sum existing credit notes against this invoice so we can cap.
  const prior = await prisma.creditNote.aggregate({
    where: { invoiceId: invoice.id, userId: user.id },
    _sum: { total: true },
  });
  const alreadyCredited = prior._sum.total ?? 0;
  const remaining = Math.max(0, invoice.total - alreadyCredited);
  if (remaining <= 0) {
    return NextResponse.json(
      { error: 'This invoice has already been fully credited.' },
      { status: 409 },
    );
  }

  const requested = parsed.data.amount ?? remaining;
  const total = Math.max(0, Math.min(requested, remaining));
  if (total === 0) {
    return NextResponse.json(
      { error: 'Amount must be greater than zero.' },
      { status: 400 },
    );
  }

  // Pro-rate VAT vs subtotal so the credit note's tax line is honest.
  const ratio = invoice.total > 0 ? total / invoice.total : 0;
  const taxAmount = invoice.vatApplied ? Math.round(invoice.tax * ratio) : 0;
  const subtotal = total - taxAmount;

  const prefix =
    user.creditNotePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'CN';

  const creditNoteNumber = await nextDocumentNumber({
    userId: user.id,
    prefix,
    table: 'creditNote',
    field: 'creditNoteNumber',
  });

  const fullyCredited = alreadyCredited + total >= invoice.total;

  const created = await prisma.$transaction(async (tx) => {
    const cn = await tx.creditNote.create({
      data: {
        userId: user.id,
        invoiceId: invoice.id,
        creditNoteNumber,
        reason: parsed.data.reason ?? null,
        subtotal,
        taxAmount,
        total,
        publicToken: makePublicToken(),
      },
    });

    if (fullyCredited && invoice.status !== 'CREDITED') {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'CREDITED' },
      });
    }
    return cn;
  });

  documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'CREDIT_NOTE',
    entityId: created.id,
    action: 'CREATED',
    metadata: { invoiceId: invoice.id, total, fullyCredited },
  });
  if (fullyCredited) {
    documentAudit.log({
      userId: user.id,
      actorId: user.id,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'CREDITED',
      metadata: { creditNoteId: created.id },
    });
  }
  documentAudit.archive({
    userId: user.id,
    documentType: 'CREDIT_NOTE',
    documentId: created.id,
    documentNumber: created.creditNoteNumber,
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
