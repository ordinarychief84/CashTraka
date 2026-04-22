import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isPropertyManager } from '@/lib/business-type';

export const runtime = 'nodejs';

type Period = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';

function periodDates(period: Period, from?: string, to?: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (period) {
    case 'this_month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    case 'last_month':
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999) };
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return { start: new Date(y, qStart, 1), end: new Date(y, qStart + 3, 0, 23, 59, 59, 999) };
    }
    case 'last_quarter': {
      const qStart = Math.floor(m / 3) * 3 - 3;
      return { start: new Date(y, qStart, 1), end: new Date(y, qStart + 3, 0, 23, 59, 59, 999) };
    }
    case 'this_year':
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) };
    case 'last_year':
      return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31, 23, 59, 59, 999) };
    case 'custom':
      return {
        start: from ? new Date(from) : new Date(y, m, 1),
        end: to ? new Date(to + 'T23:59:59.999Z') : new Date(y, m + 1, 0, 23, 59, 59, 999),
      };
    default:
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999) };
  }
}

/** Get the equivalent previous period for comparison */
function prevPeriodDates(start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
}

async function aggregateForPeriod(userId: string, start: Date, end: Date, isPm: boolean) {
  const [payments, sales, expenses, staffPay, rentPay] = await Promise.all([
    // Revenue: paid payments
    prisma.payment.aggregate({
      where: { userId, status: 'PAID', createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    }),
    // Revenue: sales
    prisma.sale.aggregate({
      where: { userId, soldAt: { gte: start, lte: end } },
      _sum: { total: true },
      _count: true,
    }),
    // Expenses by category
    prisma.expense.findMany({
      where: { userId, kind: 'business', incurredOn: { gte: start, lte: end } },
      select: { amount: true, category: true },
    }),
    // Payroll
    prisma.staffPayment.aggregate({
      where: { userId, paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    }),
    // Rent income (PM only)
    isPm
      ? prisma.rentPayment.aggregate({
          where: { userId, status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
          _count: true,
        })
      : null,
  ]);

  // Group expenses by category
  const categoryMap = new Map<string, number>();
  let totalExpenses = 0;
  for (const e of expenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.amount);
    totalExpenses += e.amount;
  }
  const expenseCategories = [...categoryMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const payrollTotal = staffPay._sum.amount ?? 0;
  const paymentRevenue = payments._sum.amount ?? 0;
  const salesRevenue = sales._sum.total ?? 0;
  const rentRevenue = rentPay?._sum.amount ?? 0;

  const totalRevenue = paymentRevenue + salesRevenue + rentRevenue;
  const totalCosts = totalExpenses + payrollTotal;
  const netIncome = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0;

  return {
    revenue: {
      payments: paymentRevenue,
      paymentCount: payments._count,
      sales: salesRevenue,
      salesCount: sales._count,
      rent: rentRevenue,
      rentCount: rentPay?._count ?? 0,
      total: totalRevenue,
    },
    expenses: {
      operating: totalExpenses,
      payroll: payrollTotal,
      payrollCount: staffPay._count,
      categories: expenseCategories,
      total: totalCosts,
    },
    netIncome,
    profitMargin,
  };
}

/**
 * GET /api/reports/pnl?period=this_month&from=&to=
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const period = (url.searchParams.get('period') || 'this_month') as Period;
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;

  const isPm = isPropertyManager(user.businessType);
  const { start, end } = periodDates(period, from, to);
  const prev = prevPeriodDates(start, end);

  // Fetch current + previous period in parallel
  const [current, previous] = await Promise.all([
    aggregateForPeriod(user.id, start, end, isPm),
    aggregateForPeriod(user.id, prev.start, prev.end, isPm),
  ]);

  // Monthly breakdown for trend chart (up to 6 months back from end)
  const months: { label: string; revenue: number; expenses: number; net: number }[] = [];
  const endMonth = end.getMonth();
  const endYear = end.getFullYear();
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(endYear, endMonth - i, 1);
    const mEnd = new Date(endYear, endMonth - i + 1, 0, 23, 59, 59, 999);
    const label = mStart.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });

    const [mPayments, mSales, mExpenses, mStaff, mRent] = await Promise.all([
      prisma.payment.aggregate({
        where: { userId: user.id, status: 'PAID', createdAt: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { userId: user.id, soldAt: { gte: mStart, lte: mEnd } },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: { userId: user.id, kind: 'business', incurredOn: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      prisma.staffPayment.aggregate({
        where: { userId: user.id, paidAt: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      isPm
        ? prisma.rentPayment.aggregate({
            where: { userId: user.id, status: 'PAID', paidAt: { gte: mStart, lte: mEnd } },
            _sum: { amount: true },
          })
        : null,
    ]);

    const rev = (mPayments._sum.amount ?? 0) + (mSales._sum.total ?? 0) + (mRent?._sum.amount ?? 0);
    const exp = (mExpenses._sum.amount ?? 0) + (mStaff._sum.amount ?? 0);
    months.push({ label, revenue: rev, expenses: exp, net: rev - exp });
  }

  // Outstanding debts snapshot
  const outstandingDebts = await prisma.debt.aggregate({
    where: { userId: user.id, status: 'OPEN' },
    _sum: { amountOwed: true, amountPaid: true },
    _count: true,
  });
  const debtsOwed = (outstandingDebts._sum.amountOwed ?? 0) - (outstandingDebts._sum.amountPaid ?? 0);

  return NextResponse.json({
    period: {
      label: period,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    current,
    previous,
    months,
    isPm,
    snapshot: {
      outstandingDebts: debtsOwed,
      debtCount: outstandingDebts._count,
    },
  });
}
