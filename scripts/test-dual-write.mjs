/**
 * Phase 4 dual-write integration test (plain ESM JS, no TS).
 *
 * Goal: prove that when we go through `prisma.<model>.create()` with both
 * the legacy naira field and the new <field>Kobo field populated via
 * `nairaToKobo()`, both columns end up in the database with consistent
 * values. This is the integration-level smoke test for the Phase 4
 * dual-write code paths.
 *
 * Creates a temporary test user with email `_kobo-test-<timestamp>@cashtraka.local`
 * exercises every modified model, then cleans up.
 *
 * Run:
 *   node scripts/test-dual-write.mjs
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

// Manual .env loader (avoid dotenv dep)
const envText = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) {
    const [, k, v] = m;
    if (!(k in process.env)) {
      process.env[k] = v.replace(/^["']|["']$/g, '').trim();
    }
  }
}

const prisma = new PrismaClient();

function nairaToKobo(naira) {
  if (!Number.isFinite(naira)) throw new Error('not finite');
  const sign = naira < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(naira) * 100);
}

const results = [];
function record(name, ok, details) {
  results.push({ name, ok, details });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${details ? ' — ' + details : ''}`);
}
function expectKoboMatch(naira, kobo, label) {
  const expected = nairaToKobo(naira);
  const ok = kobo === expected;
  record(label, ok, `naira=${naira} kobo=${kobo} expected=${expected}`);
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
    // 1. Customer
    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        name: 'Test Customer',
        phone: '08012345678',
        totalPaid: 5000,
        totalOwed: 1500,
        totalPaidKobo: nairaToKobo(5000),
        totalOwedKobo: nairaToKobo(1500),
      },
    });
    expectKoboMatch(customer.totalPaid, customer.totalPaidKobo, 'Customer.totalPaid + totalPaidKobo');
    expectKoboMatch(customer.totalOwed, customer.totalOwedKobo, 'Customer.totalOwed + totalOwedKobo');

    // 2. Payment + PaymentItem
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        customerId: customer.id,
        customerNameSnapshot: 'Test Customer',
        phoneSnapshot: '08012345678',
        amount: 5000,
        amountKobo: nairaToKobo(5000),
        status: 'PAID',
        items: {
          create: [
            { description: 'Widget', unitPrice: 2500, unitPriceKobo: nairaToKobo(2500), quantity: 2 },
          ],
        },
      },
      include: { items: true },
    });
    expectKoboMatch(payment.amount, payment.amountKobo, 'Payment.amount + amountKobo');
    expectKoboMatch(payment.items[0].unitPrice, payment.items[0].unitPriceKobo, 'PaymentItem.unitPrice + unitPriceKobo');

    // 3. Debt
    const debt = await prisma.debt.create({
      data: {
        userId: user.id,
        customerId: customer.id,
        customerNameSnapshot: 'Test Customer',
        phoneSnapshot: '08012345678',
        amountOwed: 12000,
        amountPaid: 0,
        amountOwedKobo: nairaToKobo(12000),
        amountPaidKobo: 0,
      },
    });
    expectKoboMatch(debt.amountOwed, debt.amountOwedKobo, 'Debt.amountOwed + amountOwedKobo');
    expectKoboMatch(debt.amountPaid, debt.amountPaidKobo, 'Debt.amountPaid + amountPaidKobo');

    // 4. Expense
    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        amount: 1750,
        amountKobo: nairaToKobo(1750),
        category: 'Office',
        note: 'kobo-test',
      },
    });
    expectKoboMatch(expense.amount, expense.amountKobo, 'Expense.amount + amountKobo');

    // 5. Product
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: 'Test Product',
        price: 3500,
        priceKobo: nairaToKobo(3500),
        cost: 2000,
        costKobo: nairaToKobo(2000),
      },
    });
    expectKoboMatch(product.price, product.priceKobo, 'Product.price + priceKobo');
    expectKoboMatch(product.cost, product.costKobo, 'Product.cost + costKobo');

    // 6. Sale + SaleItem
    const sale = await prisma.sale.create({
      data: {
        userId: user.id,
        saleNumber: `KOBO-SLE-${stamp}`,
        customerName: 'Walk-in',
        subtotal: 6000,
        tax: 0,
        discount: 200,
        total: 5800,
        subtotalKobo: nairaToKobo(6000),
        taxKobo: 0,
        discountKobo: nairaToKobo(200),
        totalKobo: nairaToKobo(5800),
        items: {
          create: [
            {
              description: 'Item',
              unitPrice: 3000,
              unitPriceKobo: nairaToKobo(3000),
              quantity: 2,
              total: 6000,
              totalKobo: nairaToKobo(6000),
            },
          ],
        },
      },
      include: { items: true },
    });
    expectKoboMatch(sale.subtotal, sale.subtotalKobo, 'Sale.subtotal + subtotalKobo');
    expectKoboMatch(sale.tax, sale.taxKobo, 'Sale.tax + taxKobo (zero)');
    expectKoboMatch(sale.discount, sale.discountKobo, 'Sale.discount + discountKobo');
    expectKoboMatch(sale.total, sale.totalKobo, 'Sale.total + totalKobo');
    expectKoboMatch(sale.items[0].unitPrice, sale.items[0].unitPriceKobo, 'SaleItem.unitPrice + unitPriceKobo');
    expectKoboMatch(sale.items[0].total, sale.items[0].totalKobo, 'SaleItem.total + totalKobo');

    // 7. Invoice + InvoiceItem
    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber: `KOBO-INV-${stamp}`,
        customerName: 'Test Customer',
        customerPhone: '08012345678',
        status: 'DRAFT',
        subtotal: 10000,
        discount: 500,
        tax: 712,
        total: 10212,
        subtotalKobo: nairaToKobo(10000),
        discountKobo: nairaToKobo(500),
        taxKobo: nairaToKobo(712),
        totalKobo: nairaToKobo(10212),
        items: {
          create: [
            {
              description: 'Service',
              unitPrice: 5000,
              unitPriceKobo: nairaToKobo(5000),
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
    expectKoboMatch(invoice.items[0].unitPrice, invoice.items[0].unitPriceKobo, 'InvoiceItem.unitPrice + unitPriceKobo');

    // 8. PromiseToPay
    const promise = await prisma.promiseToPay.create({
      data: {
        userId: user.id,
        customerId: customer.id,
        customerNameSnapshot: 'Test Customer',
        phoneSnapshot: '08012345678',
        originalAmount: 8000,
        remainingAmount: 8000,
        originalAmountKobo: nairaToKobo(8000),
        remainingAmountKobo: nairaToKobo(8000),
      },
    });
    expectKoboMatch(promise.originalAmount, promise.originalAmountKobo, 'PromiseToPay.originalAmount + originalAmountKobo');
    expectKoboMatch(promise.remainingAmount, promise.remainingAmountKobo, 'PromiseToPay.remainingAmount + remainingAmountKobo');

    // 9. PaymentRequest (paylink)
    const paylink = await prisma.paymentRequest.create({
      data: {
        userId: user.id,
        linkNumber: `KOBO-PLK-${stamp}`,
        customerName: 'Test Customer',
        customerPhone: '08012345678',
        amount: 7500,
        amountKobo: nairaToKobo(7500),
      },
    });
    expectKoboMatch(paylink.amount, paylink.amountKobo, 'PaymentRequest.amount + amountKobo');

  } finally {
    console.log('\nCleaning up test data...');
    // Order matters because of FK constraints (some Restrict, most Cascade).
    await prisma.invoiceItem.deleteMany({ where: { invoice: { userId: user.id } } });
    await prisma.invoice.deleteMany({ where: { userId: user.id } });
    await prisma.paymentItem.deleteMany({ where: { payment: { userId: user.id } } });
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.saleItem.deleteMany({ where: { sale: { userId: user.id } } });
    await prisma.sale.deleteMany({ where: { userId: user.id } });
    await prisma.expense.deleteMany({ where: { userId: user.id } });
    await prisma.debt.deleteMany({ where: { userId: user.id } });
    await prisma.product.deleteMany({ where: { userId: user.id } });
    await prisma.promisePayment.deleteMany({ where: { promiseToPay: { userId: user.id } } });
    await prisma.promiseToPay.deleteMany({ where: { userId: user.id } });
    await prisma.paymentRequest.deleteMany({ where: { userId: user.id } });
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
    for (const r of results) if (!r.ok) console.log(`  - ${r.name}: ${r.details ?? ''}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
