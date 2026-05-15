import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { productionOrdersService } from '@/lib/services/production-orders.service';

/**
 * Recurring production templates — operational habit loop.
 *
 *   • Create:   pick products + quantities + cadence (weekly/biweekly/monthly + day)
 *   • Pause:    cron stops spawning; reactivate later
 *   • Cancel:   soft-delete, kept for history
 *   • Spawn:    the cron compares nextRunAt <= now and creates a
 *               ProductionOrder via the existing productionOrdersService.create
 *               (which itself runs the shortage check)
 *
 * Time math is deliberately simple — no Luxon. We construct the next run
 * date by adding 7 / 14 / 28 days from the current `nextRunAt`. This is
 * approximate for "monthly" (28 days, not calendar month) — close enough
 * for SME usage and avoids the calendar-edge bugs that come with
 * arithmetic on Feb / leap years.
 */

export type Cadence = 'weekly' | 'biweekly' | 'monthly';

const CADENCE_DAYS: Record<Cadence, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 28,
};

function addCadenceDays(from: Date, cadence: Cadence): Date {
  const days = CADENCE_DAYS[cadence] ?? 7;
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Initial nextRunAt for a brand-new template. Picks the next occurrence
 * of the user's chosen day-of-week (weekly/biweekly) or day-of-month
 * (monthly) at the user's `hourOfDay`. If the day has already passed
 * this week / month, jumps forward by the cadence.
 */
function initialNextRunAt(args: {
  cadence: Cadence;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hourOfDay: number;
}): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(args.hourOfDay);

  if (args.cadence === 'monthly') {
    const day = Math.min(28, Math.max(1, args.dayOfMonth ?? next.getDate()));
    next.setDate(day);
    if (next.getTime() <= now.getTime()) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  // weekly / biweekly
  const targetDow = args.dayOfWeek ?? now.getDay();
  const diff = (7 + targetDow - next.getDay()) % 7;
  next.setDate(next.getDate() + diff);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + (args.cadence === 'biweekly' ? 14 : 7));
  }
  return next;
}

type CreateInput = {
  title: string;
  cadence: Cadence;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  hourOfDay?: number;
  notes?: string | null;
  items: { productId: string; quantity: number }[];
};

export const productionTemplatesService = {
  async listForUser(userId: string) {
    return prisma.productionTemplate.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }],
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
  },

  async getForUser(userId: string, id: string) {
    const t = await prisma.productionTemplate.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
    if (!t) throw Err.notFound('Template not found');
    return t;
  },

  async create(userId: string, input: CreateInput) {
    if (!input.title || input.title.trim().length < 2) {
      throw Err.validation('Give the template a title.');
    }
    if (input.items.length === 0) {
      throw Err.validation('Add at least one product to the template.');
    }
    const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
    if (productIds.length !== input.items.length) {
      throw Err.validation('Each product can appear only once per template.');
    }
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, userId, archived: false },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw Err.validation('One or more products are unavailable.');
    }

    const cadence = input.cadence;
    const hourOfDay = clampHour(input.hourOfDay ?? 9);
    const nextRunAt = initialNextRunAt({
      cadence,
      dayOfWeek: input.dayOfWeek ?? null,
      dayOfMonth: input.dayOfMonth ?? null,
      hourOfDay,
    });

    return prisma.productionTemplate.create({
      data: {
        userId,
        title: input.title.trim(),
        cadence,
        dayOfWeek: cadence === 'monthly' ? null : (input.dayOfWeek ?? null),
        dayOfMonth: cadence === 'monthly' ? (input.dayOfMonth ?? null) : null,
        hourOfDay,
        nextRunAt,
        status: 'active',
        notes: input.notes?.trim() || null,
        items: {
          create: input.items.map((it) => ({
            productId: it.productId,
            quantity: Math.max(1, Math.floor(it.quantity)),
          })),
        },
      },
      include: { items: true },
    });
  },

  async pause(userId: string, id: string) {
    await this.getForUser(userId, id);
    return prisma.productionTemplate.update({
      where: { id },
      data: { status: 'paused' },
    });
  },

  async resume(userId: string, id: string) {
    const t = await this.getForUser(userId, id);
    // If nextRunAt is in the past after a long pause, snap it forward.
    const now = new Date();
    let nextRunAt = t.nextRunAt;
    if (nextRunAt.getTime() <= now.getTime()) {
      nextRunAt = initialNextRunAt({
        cadence: (t.cadence as Cadence) || 'weekly',
        dayOfWeek: t.dayOfWeek,
        dayOfMonth: t.dayOfMonth,
        hourOfDay: t.hourOfDay,
      });
    }
    return prisma.productionTemplate.update({
      where: { id },
      data: { status: 'active', nextRunAt },
    });
  },

  async softDelete(userId: string, id: string) {
    await this.getForUser(userId, id);
    return prisma.productionTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  /**
   * Spawn a ProductionOrder from this template right now, regardless of
   * `nextRunAt`. Used by the "Run now" button + by the cron when a rule
   * is due.
   *
   * Advances `nextRunAt` forward by the template's cadence and stamps
   * `lastRunAt` on success.
   */
  async spawn(userId: string, templateId: string) {
    const t = await this.getForUser(userId, templateId);
    if (t.status !== 'active') {
      throw Err.validation('Template is paused. Resume it before spawning.');
    }

    const result = await productionOrdersService.create(userId, {
      items: t.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
      })),
      notes: t.notes ? `From template: ${t.title}\n${t.notes}` : `From template: ${t.title}`,
    });

    const cadence = (t.cadence as Cadence) || 'weekly';
    const advanced = addCadenceDays(t.nextRunAt, cadence);

    await prisma.productionTemplate.update({
      where: { id: t.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: advanced,
      },
    });

    return result.order;
  },

  /**
   * Cron entrypoint. Finds every active, non-deleted template whose
   * `nextRunAt <= now`, spawns a ProductionOrder for each, and returns
   * a summary. Failures on individual templates are isolated so a
   * single bad row doesn't block the whole batch.
   */
  async runDueTemplates(now: Date = new Date()) {
    const due = await prisma.productionTemplate.findMany({
      where: {
        status: 'active',
        deletedAt: null,
        nextRunAt: { lte: now },
      },
      include: {
        items: { select: { productId: true, quantity: true } },
      },
    });

    let spawned = 0;
    let failed = 0;
    const errors: { templateId: string; error: string }[] = [];

    for (const t of due) {
      try {
        await this.spawn(t.userId, t.id);
        spawned++;
      } catch (e) {
        failed++;
        errors.push({
          templateId: t.id,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    return { scanned: due.length, spawned, failed, errors };
  },
};

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 9;
  return Math.max(0, Math.min(23, Math.floor(h)));
}
