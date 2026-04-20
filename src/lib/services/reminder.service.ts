/**
 * Auto Follow-Up Reminder Service — CashTraka Phase 2
 *
 * Manages ReminderRule lifecycle and executes scheduled reminders.
 * The cron job `/api/cron/run-reminders` calls `runDueReminders()` which:
 *   1. Finds all enabled rules where nextFireAt <= now
 *   2. For each rule, builds a WhatsApp deep-link with the right tone
 *   3. Creates a ReminderLog entry
 *   4. Advances nextFireAt or auto-disables if maxReminders reached
 *   5. Updates Debt.reminderCount and Customer.totalReminders
 */

import { prisma } from '@/lib/prisma';
import {
  paymentReminderLink,
  type ReminderTone,
} from '@/lib/whatsapp.util';
import { emailService } from '@/lib/services/email.service';

// ── Types ────────────────────────────────────────────────────────────

export type CreateRuleInput = {
  userId: string;
  debtId: string;
  tone?: ReminderTone;
  intervalDays?: number;
  maxReminders?: number;
  channel?: 'whatsapp' | 'email' | 'both';
};

export type ReminderResult = {
  ruleId: string;
  debtId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  tone: string;
  whatsappLink: string;
  channel: string;
};

// ── Tone escalation ──────────────────────────────────────────────────

function autoTone(sentCount: number, maxReminders: number): ReminderTone {
  const ratio = sentCount / Math.max(maxReminders, 1);
  if (ratio >= 0.8) return 'final';
  if (ratio >= 0.4) return 'firm';
  return 'gentle';
}

// ── Service ──────────────────────────────────────────────────────────

export const reminderService = {
  /** Create a new reminder rule for a debt */
  async createRule(input: CreateRuleInput) {
    const debt = await prisma.debt.findFirst({
      where: { id: input.debtId, userId: input.userId, status: 'OPEN' },
    });
    if (!debt) throw new Error('Debt not found or already closed');

    const intervalDays = input.intervalDays ?? 3;
    const nextFireAt = new Date(Date.now() + intervalDays * 86400000);

    return prisma.reminderRule.create({
      data: {
        userId: input.userId,
        debtId: input.debtId,
        tone: input.tone || 'gentle',
        intervalDays,
        maxReminders: input.maxReminders ?? 5,
        channel: input.channel || 'whatsapp',
        nextFireAt,
      },
    });
  },

  /** List reminder rules for a user */
  async listRules(userId: string, opts?: { debtId?: string; enabled?: boolean }) {
    const where: Record<string, unknown> = { userId };
    if (opts?.debtId) where.debtId = opts.debtId;
    if (opts?.enabled !== undefined) where.enabled = opts.enabled;

    return prisma.reminderRule.findMany({
      where,
      orderBy: { nextFireAt: 'asc' },
      include: {
        debt: {
          select: {
            id: true,
            customerNameSnapshot: true,
            phoneSnapshot: true,
            amountOwed: true,
            amountPaid: true,
            status: true,
          },
        },
      },
    });
  },

  /** Update a reminder rule */
  async updateRule(id: string, userId: string, data: {
    tone?: ReminderTone;
    intervalDays?: number;
    maxReminders?: number;
    channel?: string;
    enabled?: boolean;
  }) {
    const update: Record<string, unknown> = {};
    if (data.tone !== undefined) update.tone = data.tone;
    if (data.intervalDays !== undefined) update.intervalDays = data.intervalDays;
    if (data.maxReminders !== undefined) update.maxReminders = data.maxReminders;
    if (data.channel !== undefined) update.channel = data.channel;
    if (data.enabled !== undefined) update.enabled = data.enabled;

    return prisma.reminderRule.update({
      where: { id, userId },
      data: update,
    });
  },

  /** Delete a reminder rule */
  async deleteRule(id: string, userId: string) {
    return prisma.reminderRule.delete({ where: { id, userId } });
  },

  /**
   * Execute all due reminders. Called by the cron job.
   * Returns an array of results so the cron can log what happened.
   */
  async runDueReminders(): Promise<ReminderResult[]> {
    const now = new Date();
    const results: ReminderResult[] = [];

    // Find all due rules with their debt info
    const dueRules = await prisma.reminderRule.findMany({
      where: {
        enabled: true,
        nextFireAt: { lte: now },
      },
      include: {
        debt: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        user: { select: { id: true, businessName: true } },
      },
      take: 100, // Process in batches
    });

    for (const rule of dueRules) {
      const debt = rule.debt;
      if (!debt || debt.status !== 'OPEN') {
        // Debt closed — disable the rule
        await prisma.reminderRule.update({
          where: { id: rule.id },
          data: { enabled: false },
        });
        continue;
      }

      const remaining = debt.amountOwed - debt.amountPaid;
      if (remaining <= 0) {
        await prisma.reminderRule.update({
          where: { id: rule.id },
          data: { enabled: false },
        });
        continue;
      }

      // Determine tone (auto-escalate or use rule's fixed tone)
      const tone = autoTone(rule.sentCount, rule.maxReminders);

      // Build WhatsApp link
      const waLink = paymentReminderLink({
        phone: debt.phoneSnapshot,
        customerName: debt.customerNameSnapshot,
        amount: remaining,
        tone,
        businessName: rule.user.businessName || undefined,
      });

      // Send email reminder to the business owner if channel is 'email' or 'both'
      if (rule.channel === 'email' || rule.channel === 'both') {
        const owner = await prisma.user.findUnique({
          where: { id: rule.userId },
          select: { email: true, name: true },
        });
        if (owner) {
          try {
            await emailService.sendPaymentReminder({
              to: owner.email,
              customerName: debt.customerNameSnapshot,
              businessName: rule.user.businessName || owner.name,
              amount: remaining,
              tone,
              payLink: waLink,
            });
          } catch {
            // Email send failure should not block the reminder flow
          }
        }
      }

      // Create log entry
      await prisma.reminderLog.create({
        data: {
          userId: rule.userId,
          ruleId: rule.id,
          debtId: debt.id,
          customerId: debt.customerId,
          customerName: debt.customerNameSnapshot,
          customerPhone: debt.phoneSnapshot,
          amount: remaining,
          channel: rule.channel,
          tone,
          deliveryRef: waLink,
        },
      });

      // Advance the rule
      const newSentCount = rule.sentCount + 1;
      const shouldDisable = newSentCount >= rule.maxReminders;
      const nextFireAt = shouldDisable
        ? now
        : new Date(now.getTime() + rule.intervalDays * 86400000);

      await prisma.reminderRule.update({
        where: { id: rule.id },
        data: {
          sentCount: newSentCount,
          nextFireAt,
          enabled: !shouldDisable,
        },
      });

      // Update debt reminder tracking
      await prisma.debt.update({
        where: { id: debt.id },
        data: {
          reminderCount: { increment: 1 },
          lastRemindedAt: now,
        },
      });

      // Update customer reminder tracking
      if (debt.customerId) {
        await prisma.customer.update({
          where: { id: debt.customerId },
          data: {
            totalReminders: { increment: 1 },
            lastRemindedAt: now,
          },
        });
      }

      results.push({
        ruleId: rule.id,
        debtId: debt.id,
        customerName: debt.customerNameSnapshot,
        customerPhone: debt.phoneSnapshot,
        amount: remaining,
        tone,
        whatsappLink: waLink,
        channel: rule.channel,
      });
    }

    return results;
  },

  /** Get reminder stats for a user */
  async stats(userId: string) {
    const [activeRules, totalSent, last7Days] = await Promise.all([
      prisma.reminderRule.count({ where: { userId, enabled: true } }),
      prisma.reminderLog.count({ where: { userId } }),
      prisma.reminderLog.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
    ]);
    return { activeRules, totalSent, last7Days };
  },

  /** Recent reminder logs for a user */
  async recentLogs(userId: string, take = 20) {
    return prisma.reminderLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  },
};
