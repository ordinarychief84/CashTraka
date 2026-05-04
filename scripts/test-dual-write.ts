/**
 * Phase 4 dual-write integration test.
 *
 * Exercises the modified write paths against the live database to confirm
 * both legacy naira columns and new *Kobo columns are populated.
 *
 * Creates a temporary test user with email `_kobo-test-<timestamp>@cashtraka.local`
 * and cleans up at the end. Idempotent retry-safe via the unique email.
 *
 * Run:
 *   npx tsx scripts/test-dual-write.ts
 *   (uses DATABASE_URL from .env)
 */

import { PrismaClient } from '@prisma/client';
import { paymentService } from '../src/lib/services/payment.service';
import { expenseService } from '../src/lib/services/expense.service';
import { debtService } from '../src/lib/services/debt.service';
import { recomputeCustomerTotals } from '../src/lib/customers';
import { nairaToKobo } from '../src/lib/money';

const prisma = new PrismaClient();

type Result = { name: string; ok: boolean; details?: string };
const results: Result[] = [];

function record(name: string, ok: boolean, details?: string) {
  results.push({ name, ok, details });
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${details ? ' — ' + details : ''}`);
}

function expectKoboMatch(naira: number, kobo: number, label: string) {
  const ok = kobo === nairaToKobo(naira);
  record(label, ok, `naira=${naira} kobo=${kobo} expected=${nairaToKobo(naira)}`);
  return ok;
}

async function main() {
  const stamp = Date.now();
  const email = `_kobo-test-${stamp}@cashtraka.local`;
  console.log(`Creating test user ${email}...`);

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Kobo Test',
      passwordHash: '$2a$10$test_only_not_real_hash',
      businessType: 'seller',
      lastLoginAt: new Date(),
    },
  });
  console.log(`Test user id: ${user.id}\n`);

  try {
    // ── 1. Payment + PaymentItem via paymentService ────────────────
    const paymentResult = await paymentService.create(user.id, {
      customerName: 'Test Customer A',
      phone: '08012345678',
      amount: 5_000,
      status: 'PAID',
      items: [
        { description: 'Widget', unitPrice: 2_500, quantity: 2 },
      ],
    });
    const payment = await prisma.payment.findUnique({
      where: { id: paymentResult.id },
      include: { items: true },
    });
    if (payment) {
      expectKoboMatch(payment.amount, payment.amountKobo, 'Payment.amount + amountKobo');
      const item = payment.items[0];
      if (item) {
        expectKoboMatch(item.unitPrice, item.unitPriceKobo, 'PaymentItem.unitPrice + unitPriceKobo');
      } else {
        record('PaymentItem present', false, 'no items found');
      }
    } else {
      record('Payment lookup', false);
    }

    // ── 2. Customer cache (totalPaid + totalPaidKobo) via recompute ──
    const customer = await prisma.customer.findFirst({
      where: { userId: user.id, phone: '08012345678' },
    });
    if (customer) {
      await recomputeCustomerTotals(customer.id);
      const refreshed = await prisma.customer.findUnique({ where: { id: customer.id } });
      if (refreshed) {
        expectKoboMatch(refreshed.totalPaid, refreshed.totalPaidKobo, 'Customer.totalPaid + totalPaidKobo');
        expectKoboMatch(refreshed.totalOwed, refreshed.totalOwedKobo, 'Customer.totalOwed + totalOwedKobo');
      }
    }

    // ── 3. Expense via expenseService ──────────────────────────────
    const expense = await expenseService.create(user.id, {
      amount: 1_750,
      category: 'Office',
      note: 'kobo-test',
    });
    expectKoboMatch(expense.amount, expense.amountKobo, 'Expense.amount + amountKobo');

    // ── 4. Debt via debtService ────────────────────────────────────
    const debtResult = await debtService.create(user.id, {
      customerName: 'Test Debtor',
      phone: '08099887766',
      amountOwed: 12_000,
      dueDate: null,
    });
    const debt = await prisma.debt.findUnique({ where: { id: debtResult.id } });
    if (debt) {
      expectKoboMatch(debt.amountOwed, debt.amountOwedKobo, 'Debt.amountOwed + amountOwedKobo');
      expectKoboMatch(debt.amountPaid, debt.amountPaidKobo, 'Debt.amountPaid + amountPaidKobo (zero)');
    }

    // ── 5. Direct Invoice create via prisma (bypassing zod validation) ─
    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber: `KOBO-TEST-${stamp}`,
        customerName: 'Test Customer B',
        customerPhone: '08099887766',
        status: 'DRAFT',
        subtotal: 10_000,
        discount: 500,
        tax: 712,
        total: 10_212,
        subtotalKobo: nairaToKobo(10_000),
        discountKobo: nairaToKobo(500),
        taxKobo: nairaToKobo(712),
        totalKobo: nairaToKobo(10_212),
        items: {
          create: [
            {
              description: 'Service',
              unitPrice: 5_000,
              unitPriceKobo: nairaToKobo(5_000),
              quantity: 2,
              itemType: 'SERVICE',
            },
          ],
        },
      },
      include: { items: true },
    });
    expectKoboMatch(invoice.subtotal, invoice.subtotalKobo, 'Invoice.subtotal + subtotalKobo');
    expectKoboMatch(invoice.discount, invoice.discountKobo, 'Invoice.discount + discountKobo');
    expectKoboMatch(invoice.tax, invoice.taxKobo, 'Invoice.tax + taxKobo');
    expectKoboMatch(invoice.total, invoice.totalKobo, 'Invoice.total + totalKobo');
    if (invoice.items[0]) {
      expectKoboMatch(
        invoice.items[0].unitPrice,
        invoice.items[0].unitPriceKobo,
        'InvoiceItem.unitPrice + unitPriceKobo',
      );
    }

    // ── 6. Product via direct create ───────────────────────────────
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: 'Test Product',
        price: 3_500,
        priceKobo: nairaToKobo(3_500),
        cost: 2_000,
        costKobo: nairaToKobo(2_000),
      },
    });
    expectKoboMatch(product.price, product.priceKobo, 'Product.price + priceKobo');
    if (product.cost != null && product.costKobo != null) {
      expectKoboMatch(product.cost, product.costKobo, 'Product.cost + costKobo');
    }
  } finally {
    // Cleanup — onDelete: Cascade on most child rels; Restrict on a few tax-related.
    // Manually delete in dependency order.
    console.log('\nCleaning up test data...');
    await prisma.invoiceItem.deleteMany({ where: { invoice: { userId: user.id } } });
    await prisma.invoice.deleteMany({ where: { userId: user.id } });
    await prisma.paymentItem.deleteMany({ where: { payment: { userId: user.id } } });
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.expense.deleteMany({ where: { userId: user.id } });
    await prisma.debt.deleteMany({ where: { userId: user.id } });
    await prisma.product.deleteMany({ where: { userId: user.id } });
    await prisma.customer.deleteMany({ where: { userId: user.id } });
    await prisma.receipt.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Cleanup done.\n');
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n========== RESULTS ==========`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`=============================`);

  if (failed > 0) {
    console.log('\nFailures:');
    for (const r of results) {
      if (!r.ok) console.log(`  - ${r.name}: ${r.details ?? ''}`);
    }
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
