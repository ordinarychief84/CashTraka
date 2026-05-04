import { prisma } from '@/lib/prisma';
import type { Expense } from '@prisma/client';
import { nairaToKobo } from '@/lib/money';

export type ExpenseSummary = {
  todayTotal: number;
  yesterdayTotal: number;
  weekTotal: number;
  monthTotal: number;
  count: number;
};

export type ExpenseFilters = {
  kind?: 'business' | 'personal';
  category?: string;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export const expenseService = {
  /** Create a new expense. */
  async create(
    userId: string,
    data: {
      amount: number;
      category: string;
      note?: string | null;
      incurredOn?: string;
      kind?: string;
      paymentMethod?: string | null;
      vendor?: string | null;
      isRecurring?: boolean;
      receiptRef?: string | null;
      taxDeductible?: boolean;
    },
  ): Promise<Expense & { budgetWarning?: string }> {
    // Check budget thresholds before creating
    const kind = data.kind ?? 'business';
    let budgetWarning: string | undefined;

    if (kind === 'personal') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { personalBudgetWeekly: true, personalBudgetMonthly: true },
      });
      if (user) {
        const now = new Date();
        if (user.personalBudgetMonthly) {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthTotal = await prisma.expense.aggregate({
            where: { userId, kind: 'personal', incurredOn: { gte: monthStart } },
            _sum: { amount: true },
          });
          const currentMonthSpend = (monthTotal._sum.amount ?? 0) + data.amount;
          if (currentMonthSpend > user.personalBudgetMonthly) {
            budgetWarning = `Monthly personal budget exceeded: ${currentMonthSpend} / ${user.personalBudgetMonthly}`;
          } else if (currentMonthSpend > user.personalBudgetMonthly * 0.8) {
            budgetWarning = `Approaching monthly personal budget: ${currentMonthSpend} / ${user.personalBudgetMonthly}`;
          }
        }
        if (user.personalBudgetWeekly) {
          const dayOfWeek = now.getDay();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          weekStart.setHours(0, 0, 0, 0);
          const weekTotal = await prisma.expense.aggregate({
            where: { userId, kind: 'personal', incurredOn: { gte: weekStart } },
            _sum: { amount: true },
          });
          const currentWeekSpend = (weekTotal._sum.amount ?? 0) + data.amount;
          if (currentWeekSpend > user.personalBudgetWeekly) {
            budgetWarning = `Weekly personal budget exceeded: ${currentWeekSpend} / ${user.personalBudgetWeekly}`;
          } else if (!budgetWarning && currentWeekSpend > user.personalBudgetWeekly * 0.8) {
            budgetWarning = `Approaching weekly personal budget: ${currentWeekSpend} / ${user.personalBudgetWeekly}`;
          }
        }
      }
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        amount: data.amount,
        amountKobo: nairaToKobo(data.amount),
        category: data.category,
        note: data.note || null,
        incurredOn: data.incurredOn ? new Date(data.incurredOn) : new Date(),
        kind,
        paymentMethod: data.paymentMethod || null,
        vendor: data.vendor || null,
        isRecurring: data.isRecurring ?? false,
        receiptRef: data.receiptRef || null,
        taxDeductible: data.taxDeductible ?? false,
      },
    });

    return budgetWarning ? Object.assign(expense, { budgetWarning }) : expense;
  },

  /** Update an existing expense (partial). */
  async update(
    userId: string,
    id: string,
    data: Partial<{
      amount: number;
      category: string;
      note: string | null;
      incurredOn: string;
      kind: string;
      paymentMethod: string | null;
      vendor: string | null;
      isRecurring: boolean;
      receiptRef: string | null;
      taxDeductible: boolean;
    }>,
  ): Promise<Expense | null> {
    const existing = await prisma.expense.findFirst({
      where: { id, userId },
    });
    if (!existing) return null;

    return prisma.expense.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && {
          amount: data.amount,
          amountKobo: nairaToKobo(data.amount),
        }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.note !== undefined && { note: data.note || null }),
        ...(data.incurredOn !== undefined && {
          incurredOn: new Date(data.incurredOn),
        }),
        ...(data.kind !== undefined && { kind: data.kind }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        ...(data.receiptRef !== undefined && { receiptRef: data.receiptRef }),
        ...(data.taxDeductible !== undefined && { taxDeductible: data.taxDeductible }),
      },
    });
  },

  /** Get a single expense by ID, scoped to user. */
  async get(userId: string, id: string): Promise<Expense | null> {
    return prisma.expense.findFirst({ where: { id, userId } });
  },

  /** List expenses with optional filters, search, and pagination. */
  async list(
    userId: string,
    filters: ExpenseFilters = {},
  ): Promise<{ expenses: Expense[]; total: number }> {
    const where: Record<string, unknown> = { userId };

    if (filters.kind) where.kind = filters.kind;
    if (filters.category) where.category = filters.category;

    if (filters.from || filters.to) {
      where.incurredOn = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }

    if (filters.search) {
      where.OR = [
        { category: { contains: filters.search, mode: 'insensitive' } },
        { note: { contains: filters.search, mode: 'insensitive' } },
        { vendor: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { incurredOn: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, total };
  },

  /** Summary totals for today, yesterday, this week, this month. */
  async summary(userId: string, kind?: string): Promise<ExpenseSummary> {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const kindFilter = kind ? { kind } : {};

    const [todayAgg, yesterdayAgg, weekAgg, monthAgg] = await Promise.all([
      prisma.expense.aggregate({
        where: { userId, incurredOn: { gte: today }, ...kindFilter },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          incurredOn: { gte: yesterday, lt: today },
          ...kindFilter,
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, incurredOn: { gte: weekStart }, ...kindFilter },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, incurredOn: { gte: monthStart }, ...kindFilter },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      todayTotal: todayAgg._sum.amount ?? 0,
      yesterdayTotal: yesterdayAgg._sum.amount ?? 0,
      weekTotal: weekAgg._sum.amount ?? 0,
      monthTotal: monthAgg._sum.amount ?? 0,
      count: monthAgg._count,
    };
  },

  /** Lightweight data for Daily Pulse email. */
  async dailyPulseData(
    userId: string,
  ): Promise<{ yesterdaySpent: number; todaySpent: number }> {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [yAgg, tAgg] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          userId,
          kind: 'business',
          incurredOn: { gte: yesterday, lt: today },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, kind: 'business', incurredOn: { gte: today } },
        _sum: { amount: true },
      }),
    ]);

    return {
      yesterdaySpent: yAgg._sum.amount ?? 0,
      todaySpent: tAgg._sum.amount ?? 0,
    };
  },
};
