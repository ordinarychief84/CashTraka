/**
 * Promise to Pay Service — CashTraka
 *
 * Core business logic for creating and managing payment promises.
 */

import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { paymentProviderService } from './payment-provider.service';
import { ensureProvidersRegistered } from './provider-registry';

export type CreatePromiseInput = {
  userId: string;
  customerName: string;
  phone: string;
  amount: number;
  note?: string;
  customerId?: string;
  debtId?: string;
  paymentRequestId?: string;
};

export type InitPromisePaymentInput = {
  promiseId: string;
  amount: number;
  email: string;
  provider?: string;
};

export type RecordCommitmentInput = {
  promiseToken: string;
  commitmentType: 'PAY_NOW' | 'PAY_PART' | 'PAY_ON_DATE';
  amount?: number;
  promisedDate?: string;
  message?: string;
};

export const promiseToPayService = {
  async create(input: CreatePromiseInput) {
    const phone = normalizeNigerianPhone(input.phone);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Find or create customer
    let customerId = input.customerId;
    if (\!customerId) {
      const existing = await prisma.customer.findUnique({
        where: { userId_phone: { userId: input.userId, phone } },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const customer = await prisma.customer.create({
          data: {
            userId: input.userId,
            name: input.customerName,
            phone,
          },
        });
        customerId = customer.id;
      }
    }

    const promise = await prisma.promiseToPay.create({
      data: {
        userId: input.userId,
        customerId,
        debtId: input.debtId || null,
        paymentRequestId: input.paymentRequestId || null,
        customerNameSnapshot: input.customerName,
        phoneSnapshot: phone,
        originalAmount: input.amount,
        remainingAmount: input.amount,
        status: 'OPEN',
        note: input.note || null,
      },
    });

    // Set the public URL
    const publicUrl = `${appUrl}/promise/${promise.publicToken}`;
    await prisma.promiseToPay.update({
      where: { id: promise.id },
      data: { publicUrl },
    });

    return { ...promise, publicUrl };
  },

  async getById(id: string, userId: string) {
    const promise = await prisma.promiseToPay.findUnique({
      where: { id },
      include: {
        commitments: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        customer: true,
      },
    });
    if (\!promise || promise.userId \!== userId) throw Err.notFound('Promise not found');
    return promise;
  },

  async getByToken(token: string) {
    const promise = await prisma.promiseToPay.findUnique({
      where: { publicToken: token },
      include: {
        commitments: { orderBy: { createdAt: 'desc' } },
        payments: { where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' } },
        user: {
          select: {
            businessName: true,
            name: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
            logoUrl: true,
          },
        },
      },
    });
    if (\!promise) throw Err.notFound('Promise link not found or expired');
    return promise;
  },

  async list(userId: string, status?: string) {
    return prisma.promiseToPay.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: {
        payments: { where: { status: 'SUCCESS' } },
        commitments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async recordCommitment(input: RecordCommitmentInput) {
    const promise = await prisma.promiseToPay.findUnique({
      where: { publicToken: input.promiseToken },
    });
    if (\!promise) throw Err.notFound('Promise not found');
    if (['PAID', 'CANCELLED', 'EXPIRED'].includes(promise.status)) {
      throw Err.validation('This promise is no longer active');
    }

    const commitment = await prisma.promiseCommitment.create({
      data: {
        promiseToPayId: promise.id,
        commitmentType: input.commitmentType,
        committedAmount: input.amount || null,
        promisedDate: input.promisedDate ? new Date(input.promisedDate) : null,
        message: input.message || null,
      },
    });

    // If PAY_ON_DATE, update promise status to PROMISED
    if (input.commitmentType === 'PAY_ON_DATE') {
      await prisma.promiseToPay.update({
        where: { id: promise.id },
        data: {
          status: 'PROMISED',
          lastActionAt: new Date(),
        },
      });
    } else {
      await prisma.promiseToPay.update({
        where: { id: promise.id },
        data: { lastActionAt: new Date() },
      });
    }

    return commitment;
  },

  /**
   * Initialize a payment for a promise (Pay Now or Pay Part).
   * Returns the provider checkout URL.
   */
  async initPayment(input: InitPromisePaymentInput) {
    ensureProvidersRegistered();

    const promise = await prisma.promiseToPay.findUnique({ where: { id: input.promiseId } });
    if (\!promise) throw Err.notFound('Promise not found');
    if (['PAID', 'CANCELLED', 'EXPIRED'].includes(promise.status)) {
      throw Err.validation('This promise is no longer active');
    }
    if (input.amount <= 0 || input.amount > promise.remainingAmount) {
      throw Err.validation('Invalid payment amount');
    }

    const providerName = (input.provider as any) || paymentProviderService.default();
    if (\!providerName) throw Err.validation('No payment provider available');

    const adapter = paymentProviderService.getOrThrow(providerName);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const reference = `PTP_${promise.id}_${Date.now()}`;

    // Create a pending PromisePayment record
    const promisePayment = await prisma.promisePayment.create({
      data: {
        promiseToPayId: promise.id,
        provider: providerName,
        providerReference: reference,
        amount: input.amount,
        status: 'PENDING',
      },
    });

    // Initialize the transaction with the provider
    const result = await adapter.initTransaction({
      email: input.email || 'customer@cashtraka.com',
      amount: input.amount,
      reference,
      callbackUrl: `${appUrl}/promise/${promise.publicToken}?payment=pending`,
      metadata: {
        promiseId: promise.id,
        promisePaymentId: promisePayment.id,
        userId: promise.userId,
        source: 'promise_to_pay',
      },
      customerName: promise.customerNameSnapshot,
    });

    if (\!result.ok) {
      // Clean up the pending payment record
      await prisma.promisePayment.delete({ where: { id: promisePayment.id } });
      throw Err.validation(result.error);
    }

    return {
      authorizationUrl: result.data.authorizationUrl,
      reference: result.data.reference,
      promisePaymentId: promisePayment.id,
    };
  },

  async cancel(id: string, userId: string) {
    const promise = await prisma.promiseToPay.findUnique({ where: { id } });
    if (\!promise || promise.userId \!== userId) throw Err.notFound('Promise not found');
    if (promise.status === 'PAID') throw Err.validation('Cannot cancel a paid promise');

    return prisma.promiseToPay.update({
      where: { id },
      data: { status: 'CANCELLED', lastActionAt: new Date() },
    });
  },

  /**
   * Mark promises as BROKEN when promised date passes without payment.
   * Called by cron job.
   */
  async markBrokenPromises(): Promise<number> {
    const now = new Date();
    const result = await prisma.$executeRaw`
      UPDATE "PromiseToPay" p
      SET status = 'BROKEN', "lastActionAt" = ${now}, "updatedAt" = ${now}
      WHERE p.status = 'PROMISED'
        AND EXISTS (
          SELECT 1 FROM "PromiseCommitment" c
          WHERE c."promiseToPayId" = p.id
            AND c."commitmentType" = 'PAY_ON_DATE'
            AND c."promisedDate" < ${now}
        )
    `;
    return result;
  },

  /** Summary stats for Daily Pulse */
  async pulseStats(userId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [active, broken, promised, autoConfirmedToday, partiallyPaid] = await Promise.all([
      prisma.promiseToPay.count({
        where: { userId, status: { in: ['OPEN', 'PARTIALLY_PAID', 'PROMISED'] } },
      }),
      prisma.promiseToPay.count({
        where: { userId, status: 'BROKEN' },
      }),
      prisma.promiseToPay.aggregate({
        where: { userId, status: 'PROMISED' },
        _sum: { remainingAmount: true },
      }),
      prisma.payment.count({
        where: { userId, confirmedAutomatically: true, confirmedAt: { gte: todayStart } },
      }),
      prisma.promiseToPay.aggregate({
        where: { userId, status: 'PARTIALLY_PAID' },
        _sum: { remainingAmount: true },
      }),
    ]);

    // Sum of auto-confirmed payments today
    const autoConfirmedAmount = await prisma.payment.aggregate({
      where: { userId, confirmedAutomatically: true, confirmedAt: { gte: todayStart } },
      _sum: { amount: true },
    });

    return {
      activePromises: active,
      brokenPromises: broken,
      committedUnpaid: promised._sum.remainingAmount || 0,
      partiallyRecovered: partiallyPaid._sum.remainingAmount || 0,
      autoConfirmedToday,
      autoConfirmedAmountToday: autoConfirmedAmount._sum.amount || 0,
    };
  },
};
