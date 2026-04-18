import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';

/**
 * PATCH /api/settings/personal-budget
 *
 * Owner-only (settings.write). Updates the weekly + monthly personal-
 * spending threshold fields on the user record. Both fields are optional
 * — null disables that specific alert. Amounts are in naira (whole numbers).
 */
const schema = z.object({
  personalBudgetWeekly: z.coerce
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
  personalBudgetMonthly: z.coerce
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
});

export const PATCH = (req: Request) =>
  handled(async () => {
    const ctx = await requirePermission('settings.write');
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const data: Record<string, unknown> = {};
    if (parsed.data.personalBudgetWeekly !== undefined) {
      data.personalBudgetWeekly = parsed.data.personalBudgetWeekly || null;
    }
    if (parsed.data.personalBudgetMonthly !== undefined) {
      data.personalBudgetMonthly = parsed.data.personalBudgetMonthly || null;
    }

    const updated = await prisma.user.update({
      where: { id: ctx.owner.id },
      data,
      select: { personalBudgetWeekly: true, personalBudgetMonthly: true },
    });

    return ok(updated);
  });
