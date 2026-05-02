import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  computeInvoiceTotals,
  makePublicToken,
  nextDocumentNumber,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';
import { normalizeNigerianPhone } from '@/lib/whatsapp';

export const runtime = 'nodejs';

type Template = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  applyVat: boolean;
  vatRate: number;
  discount: number;
  paymentTerms: string | null;
  note: string | null;
  items: Array<{
    productId?: string | null;
    description: string;
    unitPrice: number;
    quantity: number;
  }>;
};

/**
 * Advance `nextRunAt` for the given rule by its frequency.
 * WEEKLY = +7d, MONTHLY = +1mo, QUARTERLY = +3mo, YEARLY = +1y.
 */
function advance(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      return d;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      return d;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      return d;
    case 'MONTHLY':
    default:
      d.setMonth(d.getMonth() + 1);
      return d;
  }
}

/**
 * GET /api/cron/run-recurring-invoices
 *
 * Picks up RecurringInvoiceRule rows where status=ACTIVE and
 * nextRunAt <= now, mints a fresh Invoice from `templateData`, advances
 * `nextRunAt`, and audits the run. Errors on a single rule do not block
 * the others.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.recurringInvoiceRule.findMany({
    where: {
      status: 'ACTIVE',
      nextRunAt: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: { user: { select: { id: true, invoicePrefix: true } } },
    take: 200,
  });

  const results: Array<{
    ruleId: string;
    invoiceId?: string;
    invoiceNumber?: string;
    error?: string;
  }> = [];

  for (const rule of due) {
    try {
      const tpl = JSON.parse(rule.templateData) as Template;
      const totals = computeInvoiceTotals({
        items: tpl.items,
        discount: tpl.discount,
        vatRate: tpl.vatRate,
        applyVat: tpl.applyVat,
      });

      const prefix =
        rule.user.invoicePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ||
        'INV';

      const invoiceNumber = await nextDocumentNumber({
        userId: rule.userId,
        prefix,
        table: 'invoice',
        field: 'invoiceNumber',
      });
      const publicToken = makePublicToken();

      const invoice = await prisma.invoice.create({
        data: {
          userId: rule.userId,
          customerId: rule.customerId || undefined,
          invoiceNumber,
          publicToken,
          customerName: tpl.customerName,
          customerPhone: normalizeNigerianPhone(tpl.customerPhone),
          customerEmail: tpl.customerEmail,
          status: rule.autoSend ? 'SENT' : 'DRAFT',
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          vatApplied: tpl.applyVat,
          vatRate: totals.vatRate,
          note: tpl.note,
          paymentTerms: tpl.paymentTerms,
          recurringRuleId: rule.id,
          sentAt: rule.autoSend ? new Date() : null,
          items: {
            create: tpl.items.map((it) => ({
              productId: it.productId || null,
              description: it.description,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              itemType: 'GOODS',
            })),
          },
        },
      });

      const next = advance(rule.nextRunAt, rule.frequency);
      const stop = rule.endDate && next > rule.endDate;
      await prisma.recurringInvoiceRule.update({
        where: { id: rule.id },
        data: {
          nextRunAt: next,
          lastRunAt: now,
          lastRunError: null,
          runsCompleted: { increment: 1 },
          status: stop ? 'CANCELLED' : 'ACTIVE',
        },
      });

      documentAudit.log({
        userId: rule.userId,
        entityType: 'INVOICE',
        entityId: invoice.id,
        action: 'RECURRING_GENERATED',
        metadata: { ruleId: rule.id, invoiceNumber, autoSend: rule.autoSend },
      });
      documentAudit.archive({
        userId: rule.userId,
        documentType: 'INVOICE',
        documentId: invoice.id,
        documentNumber: invoiceNumber,
      });

      results.push({ ruleId: rule.id, invoiceId: invoice.id, invoiceNumber });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await prisma.recurringInvoiceRule
        .update({
          where: { id: rule.id },
          data: { lastRunError: msg, lastRunAt: now },
        })
        .catch(() => null);
      results.push({ ruleId: rule.id, error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
