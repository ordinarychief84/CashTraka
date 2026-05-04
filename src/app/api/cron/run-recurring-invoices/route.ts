import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  computeInvoiceTotals,
  makePublicToken,
  nextDocumentNumber,
  withDocumentNumberRetry,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';
import { normalizeNigerianPhone, waLink } from '@/lib/whatsapp';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { emailService } from '@/lib/services/email.service';
import { formatNaira } from '@/lib/format';
import { nairaToKobo } from '@/lib/money';

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
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.recurringInvoiceRule.findMany({
    where: {
      status: 'ACTIVE',
      nextRunAt: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          businessName: true,
          invoicePrefix: true,
        },
      },
    },
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

      // Defense-in-depth: validate that any customerId on the rule and any
      // productIds in the template still belong to this user. Drop unowned
      // ids to null rather than crashing — historic templateData may be stale.
      let validatedCustomerId: string | null = rule.customerId;
      if (validatedCustomerId) {
        const ownsCustomer = await prisma.customer.findFirst({
          where: { id: validatedCustomerId, userId: rule.userId },
          select: { id: true },
        });
        if (!ownsCustomer) validatedCustomerId = null;
      }
      const tplProductIds = Array.from(
        new Set(tpl.items.map((it) => it.productId).filter(Boolean) as string[]),
      );
      let ownedProductIds = new Set<string>();
      if (tplProductIds.length > 0) {
        const ownedRows = await prisma.product.findMany({
          where: { id: { in: tplProductIds }, userId: rule.userId },
          select: { id: true },
        });
        ownedProductIds = new Set(ownedRows.map((p) => p.id));
      }
      const safeItems = tpl.items.map((it) => ({
        ...it,
        productId:
          it.productId && ownedProductIds.has(it.productId) ? it.productId : null,
      }));

      const totals = computeInvoiceTotals({
        items: safeItems,
        discount: tpl.discount,
        vatRate: tpl.vatRate,
        applyVat: tpl.applyVat,
      });

      const prefix =
        rule.user.invoicePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ||
        'INV';

      const publicToken = makePublicToken();

      // Mint number + create + advance the rule in a single transaction.
      // Wrapped in withDocumentNumberRetry to survive concurrent runs that
      // might race past nextDocumentNumber's SELECT step.
      const { invoice, invoiceNumber } = await withDocumentNumberRetry(
        async () => {
          const invoiceNumber = await nextDocumentNumber({
            userId: rule.userId,
            prefix,
            table: 'invoice',
            field: 'invoiceNumber',
          });
          return prisma.$transaction(async (tx) => {
            const created = await tx.invoice.create({
              data: {
                userId: rule.userId,
                customerId: validatedCustomerId || undefined,
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
                subtotalKobo: nairaToKobo(totals.subtotal),
                discountKobo: nairaToKobo(totals.discount),
                taxKobo: nairaToKobo(totals.tax),
                totalKobo: nairaToKobo(totals.total),
                vatApplied: tpl.applyVat,
                vatRate: totals.vatRate,
                note: tpl.note,
                paymentTerms: tpl.paymentTerms,
                recurringRuleId: rule.id,
                sentAt: rule.autoSend ? new Date() : null,
                items: {
                  create: safeItems.map((it) => ({
                    productId: it.productId || null,
                    description: it.description,
                    unitPrice: it.unitPrice,
                    unitPriceKobo: nairaToKobo(it.unitPrice),
                    quantity: it.quantity,
                    itemType: 'GOODS',
                  })),
                },
              },
            });

            const next = advance(rule.nextRunAt, rule.frequency);
            const stop = rule.endDate && next > rule.endDate;
            await tx.recurringInvoiceRule.update({
              where: { id: rule.id },
              data: {
                nextRunAt: next,
                lastRunAt: now,
                lastRunError: null,
                runsCompleted: { increment: 1 },
                status: stop ? 'CANCELLED' : 'ACTIVE',
              },
            });
            return { invoice: created, invoiceNumber };
          });
        },
      );

      await documentAudit.log({
        userId: rule.userId,
        entityType: 'INVOICE',
        entityId: invoice.id,
        action: 'RECURRING_GENERATED',
        metadata: { ruleId: rule.id, invoiceNumber, autoSend: rule.autoSend },
      });
      await documentAudit.archive({
        userId: rule.userId,
        documentType: 'INVOICE',
        documentId: invoice.id,
        documentNumber: invoiceNumber,
      });

      // autoSend: after the tx commits, fire courtesy email to customer
      // (non-fatal) and capture a wa.me link for the seller in audit metadata.
      if (rule.autoSend) {
        const business =
          rule.user.businessName?.trim() || rule.user.name?.trim() || 'Your seller';
        const baseUrl = process.env.APP_URL || 'https://cashtraka.co';
        const publicUrl = `${baseUrl}/invoice/${publicToken}`;
        const message =
          `Hi ${tpl.customerName}, here is your invoice ${invoiceNumber} ` +
          `from ${business} for ${formatNaira(totals.total)}.\n` +
          `View and pay securely: ${publicUrl}`;

        if (tpl.customerEmail) {
          try {
            await emailService.sendInvoice({
              to: tpl.customerEmail,
              customerName: tpl.customerName,
              business,
              invoiceNumber,
              amount: totals.total,
              dueDate: null,
              invoiceUrl: `/invoice/${publicToken}`,
            });
          } catch {
            // Non-fatal — autoSend should never block the cron loop.
          }
        }
        const phone = normalizeNigerianPhone(tpl.customerPhone);
        const wa = phone ? waLink(phone, message) : null;
        await documentAudit.log({
          userId: rule.userId,
          entityType: 'INVOICE',
          entityId: invoice.id,
          action: 'SENT',
          metadata: { autoSend: true, waLink: wa, emailedTo: tpl.customerEmail },
        });
      }

      results.push({ ruleId: rule.id, invoiceId: invoice.id, invoiceNumber });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `[cron.run-recurring-invoices] rule ${rule.id} (user ${rule.userId}) failed: ${msg}`,
        err,
      );
      await prisma.recurringInvoiceRule
        .update({
          where: { id: rule.id },
          data: { lastRunError: msg, lastRunAt: now },
        })
        .catch((e) => {
          console.error(
            `[cron.run-recurring-invoices] could not record lastRunError on rule ${rule.id}`,
            e,
          );
          return null;
        });
      // Surface the failure to the seller so they know recurring billing
      // did not run for this rule.
      await prisma.notification
        .create({
          data: {
            userId: rule.userId,
            type: 'warning',
            title: 'Recurring invoice did not run',
            message: `A scheduled invoice could not be created. Open the rule to review the error and retry.`,
            link: `/invoices/recurring`,
          },
        })
        .catch(() => null);
      results.push({ ruleId: rule.id, error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
