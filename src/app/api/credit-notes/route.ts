import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireFeature } from '@/lib/gate';
import { effectivePlan, limitsFor } from '@/lib/plan-limits';
import {
  nextDocumentNumber,
  makePublicToken,
  withDocumentNumberRetry,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';
import { nairaToKobo } from '@/lib/money';

/**
 * Tax+ two-person rule threshold for credit notes. Notes with a total
 * above this value need a second team member's confirmation, unless
 * the actor is the owner. Stored in the credit note's `total` units:
 * the model uses naira-as-int (the migrate route's column is INTEGER
 * with no kobo scaling), so the threshold is plain naira.
 */
const TWO_PERSON_THRESHOLD = 100_000;

export const runtime = 'nodejs';

const bodySchema = z.object({
  invoiceId: z.string().min(1),
  /// Optional partial credit. Defaults to the invoice's current total.
  /// Always clamped to [0, invoice.total - alreadyCredited] in the service.
  amount: z.coerce.number().int().nonnegative().optional(),
  reason: z.string().trim().max(500).optional(),
  /// Tax+ two-person rule: id of the second team member confirming a
  /// high-value credit note. Required when the resolved total is above
  /// `TWO_PERSON_THRESHOLD` and the actor is not the owner. Must be a
  /// different staff id than the actor.
  confirmedBy: z.string().trim().min(1).optional(),
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
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = auth.owner;

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
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = auth.owner;

  const feature = await requireFeature(user, 'creditNotes');
  if (feature) return feature;

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

  // Tax+ two-person rule: a second team member must confirm credit notes
  // above ₦100,000. Owners bypass. Only enforced when the seller's plan
  // grants `multiUserAudit` (Tax+).
  const eff = effectivePlan(user);
  const limits = limitsFor(eff.plan);
  let approvedById: string | null = null;
  if (
    limits.multiUserAudit &&
    !auth.isOwner &&
    total > TWO_PERSON_THRESHOLD
  ) {
    const confirmedBy = parsed.data.confirmedBy?.trim();
    if (!confirmedBy || confirmedBy === auth.principalId) {
      return NextResponse.json(
        {
          error: 'A second team member must confirm credit notes over ₦100,000.',
          code: 'NEEDS_SECOND_APPROVAL',
        },
        { status: 409 },
      );
    }
    // Verify the confirmer is an active staff member on the same tenant
    // and is not the actor themselves.
    const confirmer = await prisma.staffMember.findFirst({
      where: {
        id: confirmedBy,
        userId: user.id,
        status: 'active',
      },
      select: { id: true, accessRole: true },
    });
    if (!confirmer || confirmer.id === auth.principalId) {
      return NextResponse.json(
        {
          error: 'A second team member must confirm credit notes over ₦100,000.',
          code: 'NEEDS_SECOND_APPROVAL',
        },
        { status: 409 },
      );
    }
    approvedById = confirmer.id;
  }

  // Pro-rate VAT vs subtotal so the credit note's tax line is honest.
  const ratio = invoice.total > 0 ? total / invoice.total : 0;
  const taxAmount = invoice.vatApplied ? Math.round(invoice.tax * ratio) : 0;
  const subtotal = total - taxAmount;

  const prefix =
    user.creditNotePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'CN';

  const fullyCredited = alreadyCredited + total >= invoice.total;

  const created = await withDocumentNumberRetry(async () => {
    const creditNoteNumber = await nextDocumentNumber({
      userId: user.id,
      prefix,
      table: 'creditNote',
      field: 'creditNoteNumber',
    });
    return prisma.$transaction(async (tx) => {
      const cn = await tx.creditNote.create({
        data: {
          userId: user.id,
          invoiceId: invoice.id,
          creditNoteNumber,
          reason: parsed.data.reason ?? null,
          subtotal,
          taxAmount,
          total,
          subtotalKobo: nairaToKobo(subtotal),
          taxAmountKobo: nairaToKobo(taxAmount),
          totalKobo: nairaToKobo(total),
          publicToken: makePublicToken(),
          approvedById,
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
  });

  await documentAudit.log({
    userId: user.id,
    actorId: auth.principalId,
    entityType: 'CREDIT_NOTE',
    entityId: created.id,
    action: 'CREATED',
    metadata: {
      invoiceId: invoice.id,
      total,
      fullyCredited,
      approvedById: approvedById ?? undefined,
    },
  });
  if (fullyCredited) {
    await documentAudit.log({
      userId: user.id,
      actorId: auth.principalId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'CREDITED',
      metadata: { creditNoteId: created.id },
    });
  }
  await documentAudit.archive({
    userId: user.id,
    documentType: 'CREDIT_NOTE',
    documentId: created.id,
    documentNumber: created.creditNoteNumber,
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
