/**
 * Phase 5 of the kobo migration: one-shot backfill (Node wrapper).
 *
 * Runs the same UPDATE statements as scripts/backfill-kobo.sql but via
 * Prisma's `$executeRawUnsafe`, so it works without a local psql install
 * and reports row-affected counts per table. Idempotent.
 *
 * Run:
 *   node scripts/backfill-kobo.mjs
 *
 * Prereqs:
 *   - .env with DATABASE_URL
 *   - prisma client generated
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

/**
 * One backfill operation. naira & kobo are column names. table is a Postgres
 * identifier (we quote it). When `nullable=true`, the predicate uses IS NULL on
 * the kobo side (matches the original schema for Product.cost,
 * Receipt.balanceRemaining, InstallmentPlan.initialAmount).
 */
const ops = [
  ['Customer',      'totalPaid',         'totalPaidKobo',         false],
  ['Customer',      'totalOwed',         'totalOwedKobo',         false],
  ['Payment',       'amount',            'amountKobo',            false],
  ['PaymentItem',   'unitPrice',         'unitPriceKobo',         false],
  ['Debt',          'amountOwed',        'amountOwedKobo',        false],
  ['Debt',          'amountPaid',        'amountPaidKobo',        false],
  ['Product',       'price',             'priceKobo',             false],
  ['Product',       'cost',              'costKobo',              true],
  ['Sale',          'subtotal',          'subtotalKobo',          false],
  ['Sale',          'tax',               'taxKobo',               false],
  ['Sale',          'discount',          'discountKobo',          false],
  ['Sale',          'total',             'totalKobo',             false],
  ['SaleItem',      'unitPrice',         'unitPriceKobo',         false],
  ['SaleItem',      'total',             'totalKobo',             false],
  ['Expense',       'amount',            'amountKobo',            false],
  ['Invoice',       'subtotal',          'subtotalKobo',          false],
  ['Invoice',       'discount',          'discountKobo',          false],
  ['Invoice',       'tax',               'taxKobo',               false],
  ['Invoice',       'total',             'totalKobo',             false],
  ['Invoice',       'amountPaid',        'amountPaidKobo',        false],
  ['InvoiceItem',   'unitPrice',         'unitPriceKobo',         false],
  ['CreditNote',    'subtotal',          'subtotalKobo',          false],
  ['CreditNote',    'taxAmount',         'taxAmountKobo',         false],
  ['CreditNote',    'total',             'totalKobo',             false],
  ['Offer',         'subtotal',          'subtotalKobo',          false],
  ['Offer',         'taxAmount',         'taxAmountKobo',         false],
  ['Offer',         'total',             'totalKobo',             false],
  ['OfferItem',     'unitPrice',         'unitPriceKobo',         false],
  ['OrderConfirmation', 'total',         'totalKobo',             false],
  ['Tenant',        'rentAmount',        'rentAmountKobo',        false],
  ['RentPayment',   'amount',            'amountKobo',            false],
  ['StaffMember',   'payAmount',         'payAmountKobo',         false],
  ['StaffPayment',  'amount',            'amountKobo',            false],
  ['Receipt',       'balanceRemaining',  'balanceRemainingKobo',  true],
  ['Refund',        'amount',            'amountKobo',            false],
  ['PaymentRequest', 'amount',           'amountKobo',            false],
  ['ReminderLog',   'amount',            'amountKobo',            false],
  ['CollectionScore', 'collectedAmount',   'collectedAmountKobo',   false],
  ['CollectionScore', 'outstandingAmount', 'outstandingAmountKobo', false],
  ['PromiseToPay',  'originalAmount',    'originalAmountKobo',    false],
  ['PromiseToPay',  'remainingAmount',   'remainingAmountKobo',   false],
  ['PromisePayment', 'amount',           'amountKobo',            false],
  ['InstallmentPlan', 'totalAmount',     'totalAmountKobo',       false],
  ['InstallmentPlan', 'remainingAmount', 'remainingAmountKobo',   false],
  ['InstallmentPlan', 'initialAmount',   'initialAmountKobo',     true],
  ['InstallmentPlan', 'recurringAmount', 'recurringAmountKobo',   false],
  ['InstallmentCharge', 'amount',        'amountKobo',            false],
];

async function main() {
  console.log(`Phase 5 backfill: ${ops.length} columns to scan.\n`);

  const results = [];
  let totalUpdated = 0;
  let mismatched = 0;

  for (const [table, naira, kobo, nullable] of ops) {
    const predicate = nullable
      ? `"${kobo}" IS NULL AND "${naira}" IS NOT NULL`
      : `"${kobo}" = 0 AND "${naira}" != 0`;
    const sql = `UPDATE "${table}" SET "${kobo}" = "${naira}" * 100 WHERE ${predicate}`;
    let updated = 0;
    try {
      updated = await prisma.$executeRawUnsafe(sql);
      totalUpdated += updated;
      results.push({ table, naira, kobo, updated, ok: true });
      console.log(`  ${table}.${naira} → ${kobo}: ${updated} row(s) updated`);
    } catch (e) {
      results.push({ table, naira, kobo, updated: 0, ok: false, error: e.message });
      console.error(`  FAIL ${table}.${kobo}: ${e.message?.slice(0, 200)}`);
    }
  }

  console.log(`\nTotal rows updated: ${totalUpdated}\n`);

  // Post-check: count any remaining mismatches.
  console.log('Post-backfill consistency check:');
  for (const [table, naira, kobo, nullable] of ops) {
    const mismatchSql = nullable
      ? `SELECT COUNT(*)::int AS c FROM "${table}" WHERE ("${kobo}" IS NULL AND "${naira}" IS NOT NULL) OR ("${kobo}" IS NOT NULL AND "${naira}" IS NOT NULL AND "${kobo}" != "${naira}" * 100)`
      : `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "${kobo}" != "${naira}" * 100`;
    const rows = await prisma.$queryRawUnsafe(mismatchSql);
    const c = Number(rows[0]?.c ?? 0);
    if (c > 0) {
      mismatched += c;
      console.log(`  ⚠ ${table}.${kobo}: ${c} row(s) still mismatched`);
    }
  }

  if (mismatched === 0) {
    console.log('  ✓ All legacy ↔ kobo pairs are consistent across all tables.');
  } else {
    console.log(`\n${mismatched} row(s) remain mismatched. Inspect manually.`);
  }
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
