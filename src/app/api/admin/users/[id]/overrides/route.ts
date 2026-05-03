import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import {
  setOverrideFlag,
  setDiscountKobo,
  clearOverride,
  type OverrideValue,
} from '@/lib/services/user-override.service';
import type { Limits } from '@/lib/plan-limits';

export const runtime = 'nodejs';

const ALLOWED_KEYS: ReadonlyArray<keyof Limits> = [
  // Numeric quotas
  'paymentsPerMonth',
  'activeDebts',
  'customers',
  'templates',
  'properties',
  'tenants',
  'teamMembers',
  'maxReminderRules',
  // Boolean feature flags
  'invoices',
  'creditNotes',
  'recurringInvoices',
  'firsCompliance',
  'electronicXml',
  'deliveryNotes',
  'offers',
  'paystackPay',
  'paymentReminders',
  'serviceCheck',
  'customBranding',
  'prioritySupport',
  'attendance',
  'payroll',
  'autoReminders',
  'behaviorTracking',
  'collectionScore',
  'suggestions',
  'documentAudit',
  'csvExport',
  'checklists',
  'tasks',
  'products',
  'expenses',
  'reports',
  'bankVerification',
];

const schema = z.object({
  flag: z.string(),
  value: z.union([z.boolean(), z.number().int().min(0), z.null()]).optional(),
  /** Per-user discount in kobo (negative = credit). */
  discountKobo: z.number().int().nullable().optional(),
  /** Set to true to delete the entire override row. */
  clear: z.boolean().optional(),
});

/**
 * PATCH /api/admin/users/[id]/overrides
 *
 * Single endpoint for managing per-user overrides. Body forms:
 *   { flag: 'firsCompliance', value: true }    // force feature on
 *   { flag: 'firsCompliance', value: false }   // force feature off
 *   { flag: 'firsCompliance', value: null }    // unset, return to plan default
 *   { flag: 'customers', value: 5000 }         // numeric quota override
 *   { flag: 'customers', value: null }         // unlimited override
 *   { discountKobo: -500000 }                  // ₦5,000 credit at next renewal
 *   { clear: true }                            // delete the override row
 */
export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const user = await prisma.user.findUnique({ where: { id: ctx.params.id } });
    if (!user) return fail('User not found', 404);

    if (parsed.data.clear) {
      const removed = await clearOverride(user.id);
      await prisma.auditLog
        .create({
          data: {
            adminId: admin.id,
            action: 'subscription.override.clear',
            targetId: user.id,
            details: JSON.stringify({ removed }),
          },
        })
        .catch(() => null);
      return ok({ cleared: removed });
    }

    if (parsed.data.discountKobo !== undefined) {
      await setDiscountKobo(user.id, parsed.data.discountKobo);
      await prisma.auditLog
        .create({
          data: {
            adminId: admin.id,
            action: 'subscription.override.discount',
            targetId: user.id,
            details: JSON.stringify({ discountKobo: parsed.data.discountKobo }),
          },
        })
        .catch(() => null);
      return ok({ discountKobo: parsed.data.discountKobo });
    }

    if (!parsed.data.flag) return fail('Missing flag', 422);
    if (!ALLOWED_KEYS.includes(parsed.data.flag as keyof Limits)) {
      return fail('Unknown override key', 422);
    }

    // value === null clears the key; value undefined is treated the same way
    // for backwards compatibility with the simple "unset" use case.
    const incoming: OverrideValue | undefined = parsed.data.value === undefined
      ? undefined
      : (parsed.data.value as OverrideValue);

    const next = await setOverrideFlag(
      user.id,
      parsed.data.flag as keyof Limits,
      incoming,
    );

    await prisma.auditLog
      .create({
        data: {
          adminId: admin.id,
          action: 'subscription.override.set',
          targetId: user.id,
          details: JSON.stringify({
            flag: parsed.data.flag,
            value: incoming === undefined ? '__unset__' : incoming,
          }),
        },
      })
      .catch(() => null);

    return ok({ overrides: next });
  });
