/**
 * Customer credit score - internal service.
 *
 * v1 produces a 0-100 score per customer from payment + invoice signals
 * already in the DB. The math is intentionally transparent so the seller
 * can explain it on the customer detail page:
 *
 *   start                                         70
 *   per Payment row                                +1   (cap +20)
 *   per Invoice paid on time                       +3   (cap +20)
 *   per Invoice paid late                          -min(15, days_late)
 *                                                   (total cap -25)
 *   per outstanding PARTIALLY_PAID / OVERDUE       -5   (cap -20)
 *   clamped to [0, 100]
 *
 * "On time" means paidAt <= dueDate (inclusive). "Late" days_late is
 * floor((paidAt - dueDate) / day). When dueDate is null we treat the
 * invoice as on-time only if PAID, otherwise neutral.
 *
 * Bands:
 *   80-100  Excellent payer    (green)
 *   60-79   Reliable           (brand-cyan)
 *   40-59   Mixed history      (amber)
 *    0-39   High risk          (red)
 *
 * Customers with zero history get band='New' and a neutral chip.
 */

import { prisma } from '@/lib/prisma';

export type CreditBand = 'New' | 'Excellent payer' | 'Reliable' | 'Mixed history' | 'High risk';

export type CustomerCreditScore = {
  score: number;
  band: CreditBand;
  /** Convenience label used by the badge. */
  label: string;
  signals: {
    onTimeCount: number;
    lateCount: number;
    overdueOpenCount: number;
    paymentsCount: number;
  };
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function bandFor(score: number): CreditBand {
  if (score >= 80) return 'Excellent payer';
  if (score >= 60) return 'Reliable';
  if (score >= 40) return 'Mixed history';
  return 'High risk';
}

export async function getCustomerCreditScore(
  customerId: string,
  userId: string,
): Promise<CustomerCreditScore> {
  // Owner-scope every read so a manipulated customerId from another tenant
  // returns a "no history" result rather than leaking signals.
  const [paymentsCount, invoices] = await Promise.all([
    prisma.payment.count({ where: { userId, customerId } }),
    prisma.invoice.findMany({
      where: { userId, customerId },
      select: { status: true, dueDate: true, paidAt: true },
    }),
  ]);

  let onTimeCount = 0;
  let lateCount = 0;
  let overdueOpenCount = 0;
  let lateDaysTotal = 0;

  for (const inv of invoices) {
    if (inv.status === 'PAID') {
      if (!inv.dueDate || !inv.paidAt) {
        // Treat as on-time for v1; we can't prove tardiness without a due
        // date, and PAID is a positive signal worth crediting.
        onTimeCount += 1;
        continue;
      }
      if (inv.paidAt.getTime() <= inv.dueDate.getTime()) {
        onTimeCount += 1;
      } else {
        lateCount += 1;
        const daysLate = Math.floor(
          (inv.paidAt.getTime() - inv.dueDate.getTime()) / MS_PER_DAY,
        );
        lateDaysTotal += Math.min(15, Math.max(1, daysLate));
      }
    } else if (inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE') {
      overdueOpenCount += 1;
    }
  }

  const totalSignals = paymentsCount + onTimeCount + lateCount + overdueOpenCount;
  if (totalSignals === 0) {
    return {
      score: 70,
      band: 'New',
      label: 'New',
      signals: {
        onTimeCount: 0,
        lateCount: 0,
        overdueOpenCount: 0,
        paymentsCount: 0,
      },
    };
  }

  let score = 70;
  score += Math.min(20, paymentsCount * 1);
  score += Math.min(20, onTimeCount * 3);
  score -= Math.min(25, lateDaysTotal);
  score -= Math.min(20, overdueOpenCount * 5);

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const band = bandFor(score);

  return {
    score,
    band,
    label: band,
    signals: {
      onTimeCount,
      lateCount,
      overdueOpenCount,
      paymentsCount,
    },
  };
}
