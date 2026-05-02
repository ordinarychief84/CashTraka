import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  computeInvoiceTotals,
  makePublicToken,
  nextDocumentNumber,
  withDocumentNumberRetry,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';
import { normalizeNigerianPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

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

/** Advance nextRunAt by frequency. Mirrors the cron's advance(). */
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
 * POST /api/admin/recurring-invoices/[id]/run-now, force-run a single rule.
 * Inlines the per-rule logic from /api/cron/run-recurring-invoices to avoid
 * cross-cutting refactors of the cron route.
 */
export async function POST(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin();

    const rule = await prisma.recurringInvoiceRule.findUnique({
      where: { id: ctx.params.id },
      include: {
        user: {
          select: { id: true, name: true, businessName: true, invoicePrefix: true },
        },
      },
    });
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const now = new Date();
    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;

    try {
      const tpl = JSON.parse(rule.templateData) as Template;

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

      const result = await withDocumentNumberRetry(async () => {
        const number = await nextDocumentNumber({
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
              invoiceNumber: number,
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
                create: safeItems.map((it) => ({
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
          return { invoice: created, invoiceNumber: number };
        });
      });

      invoiceId = result.invoice.id;
      invoiceNumber = result.invoiceNumber;

      await documentAudit.log({
        userId: rule.userId,
        actorId: admin.id,
        entityType: 'INVOICE',
        entityId: invoiceId,
        action: 'RECURRING_GENERATED',
        metadata: {
          ruleId: rule.id,
          invoiceNumber,
          autoSend: rule.autoSend,
          adminForceRun: true,
        },
      });
      await documentAudit.archive({
        userId: rule.userId,
        documentType: 'INVOICE',
        documentId: invoiceId,
        documentNumber: invoiceNumber,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await prisma.recurringInvoiceRule
        .update({
          where: { id: rule.id },
          data: { lastRunError: msg, lastRunAt: now },
        })
        .catch(() => null);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'recurring.force-run',
        targetId: rule.id,
        details: JSON.stringify({
          targetId: rule.id,
          actorAdminId: admin.id,
          invoiceId,
          invoiceNumber,
        }),
      },
    });

    return NextResponse.json({ success: true, invoiceId, invoiceNumber });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/admin/recurring-invoices/[id]/run-now error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
