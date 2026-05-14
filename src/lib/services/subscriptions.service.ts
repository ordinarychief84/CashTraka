import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { customerOrdersService } from './customer-orders.service';
import { documentAudit } from './document-audit.service';

/**
 * Recurring customer-order subscriptions — "monthly cleansing balm box
 * for Adaeze." A daily cron compares `nextRunAt <= now` and materialises
 * the next CustomerOrder for every active subscription.
 *
 * Item snapshot is stored as JSON on the subscription so price changes
 * on the underlying Product don't surprise the customer mid-window;
 * users can edit the items + price by editing the subscription.
 */

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export type SubscriptionItemSnapshot = {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPriceKobo: number;
};

export type CreateSubscriptionInput = {
  customerId: string;
  cadence: Cadence;
  items: SubscriptionItemSnapshot[];
  /** First materialisation date. */
  startsAt: Date;
  endsAt?: Date | null;
  notes?: string | null;
};

function advance(from: Date, cadence: Cadence): Date {
  const d = new Date(from);
  if (cadence === 'weekly') d.setDate(d.getDate() + 7);
  else if (cadence === 'biweekly') d.setDate(d.getDate() + 14);
  else if (cadence === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cadence === 'quarterly') d.setMonth(d.getMonth() + 3);
  return d;
}

export const subscriptionsService = {
  async listForUser(userId: string) {
    return prisma.customerOrderSubscription.findMany({
      where: { userId },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }],
    });
  },

  async listForCustomer(userId: string, customerId: string) {
    return prisma.customerOrderSubscription.findMany({
      where: { userId, customerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(userId: string, input: CreateSubscriptionInput, actorId?: string | null) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, userId },
      select: { id: true },
    });
    if (!customer) throw Err.validation('Customer not found.');
    if (input.items.length === 0) throw Err.validation('At least one item is required.');
    if (!['weekly', 'biweekly', 'monthly', 'quarterly'].includes(input.cadence)) {
      throw Err.validation('Invalid cadence.');
    }
    const sub = await prisma.customerOrderSubscription.create({
      data: {
        userId,
        customerId: input.customerId,
        cadence: input.cadence,
        itemsJson: JSON.stringify(input.items),
        nextRunAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        notes: input.notes?.trim() || null,
      },
    });
    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'SUBSCRIPTION' as any,
        entityId: sub.id,
        action: 'CREATED' as any,
        metadata: { cadence: sub.cadence, items: input.items.length },
      })
      .catch(() => {});
    return sub;
  },

  async setStatus(
    userId: string,
    subscriptionId: string,
    status: 'active' | 'paused' | 'cancelled',
    actorId?: string | null,
  ) {
    const sub = await prisma.customerOrderSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });
    if (!sub) throw Err.notFound('Subscription not found');
    if (sub.status === 'cancelled') {
      throw Err.conflict('Subscription is already cancelled.');
    }
    const updated = await prisma.customerOrderSubscription.update({
      where: { id: subscriptionId },
      data: { status },
    });
    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'SUBSCRIPTION' as any,
        entityId: updated.id,
        action: status === 'cancelled' ? ('CANCELLED' as any) : ('STATUS_CHANGED' as any),
        metadata: { status },
      })
      .catch(() => {});
    return updated;
  },

  /**
   * Materialise every active subscription whose `nextRunAt <= now`. For
   * each one: create a CustomerOrder using the snapshotted items + price,
   * advance `nextRunAt`, set `lastRunAt`, auto-cancel if past `endsAt`.
   *
   * Idempotent at the day level: if the cron fires twice in the same
   * day it won't double-spawn because we use a strict timestamp compare
   * — each successful run pushes `nextRunAt` forward.
   *
   * Returns { processed, spawned, errors } for the cron route to log.
   */
  async runDueSubscriptions(now: Date = new Date()) {
    const due = await prisma.customerOrderSubscription.findMany({
      where: { status: 'active', nextRunAt: { lte: now } },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      take: 500,
    });

    let spawned = 0;
    const errors: { subscriptionId: string; error: string }[] = [];
    for (const sub of due) {
      try {
        const items = JSON.parse(sub.itemsJson) as SubscriptionItemSnapshot[];
        await customerOrdersService.create(sub.userId, {
          customerId: sub.customerId,
          customerName: sub.customer.name,
          customerPhone: sub.customer.phone,
          notes: `Auto-generated from subscription. ${sub.notes ?? ''}`.trim(),
          items: items.map((it) => ({
            productId: it.productId ?? null,
            description: it.description,
            quantity: it.quantity,
            unitPriceKobo: it.unitPriceKobo,
          })),
        });

        const nextRunAt = advance(sub.nextRunAt, sub.cadence as Cadence);
        const shouldClose = sub.endsAt && nextRunAt > sub.endsAt;
        await prisma.customerOrderSubscription.update({
          where: { id: sub.id },
          data: {
            lastRunAt: now,
            nextRunAt: shouldClose ? sub.nextRunAt : nextRunAt,
            status: shouldClose ? 'cancelled' : sub.status,
          },
        });
        spawned += 1;
      } catch (e) {
        errors.push({
          subscriptionId: sub.id,
          error: e instanceof Error ? e.message : 'unknown',
        });
      }
    }
    return { processed: due.length, spawned, errors };
  },
};
