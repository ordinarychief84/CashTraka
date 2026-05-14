/**
 * One-shot cleanup of dead schema left behind by the landlord/property
 * vertical and other pre-pivot features. Drops tables and columns that
 * are no longer in `prisma/schema.prisma` and are no longer read by any
 * code path.
 *
 * Idempotent: every DROP uses IF EXISTS. Safe to re-run.
 *
 * Run:  npx tsx scripts/drop-dead-schema.ts                  # dry-run
 *       CONFIRM_DROP=yes npx tsx scripts/drop-dead-schema.ts # apply
 *
 * Drops:
 *   • Tables: Property, Tenant, RentPayment, LeaseReminder
 *     (Schema models removed during the landlord-vertical kill;
 *     2 + 3 + 0 + 0 rows survived as ghost data.)
 *   • Columns: Debt.autoRemind, Expense.isPersonal,
 *     Invoice.nrsRetryCount, Product.isActive
 *     (Replaced by ReminderSchedule, Expense.kind, FIRS retry count,
 *     and Product.archived respectively.)
 *   • AdminStaff rows with adminRole='PROPERTY_MANAGER' (dead role,
 *     removed from src/lib/admin-rbac.ts in this PR).
 *
 * The drops are intentional: nothing in the codebase reads these
 * tables/columns. The data is either test rows from the old vertical
 * or pre-migration scratch state.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CONFIRM = process.env.CONFIRM_DROP === 'yes';

function maskConn(url: string | undefined): string {
  if (!url) return '<unset>';
  try {
    const u = new URL(url);
    return `${u.protocol}//****@${u.hostname}${u.pathname}`;
  } catch {
    return '<unparseable>';
  }
}

async function exec(label: string, sql: string) {
  process.stdout.write(`  ${label} … `);
  if (!CONFIRM) {
    console.log('would run (dry-run)');
    return;
  }
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('ok');
  } catch (e: any) {
    console.log('FAIL:', (e.message || '').split('\n')[0]);
    throw e;
  }
}

async function rowCount(table: string): Promise<number | 'missing'> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM "${table}"`,
    );
    return Number(rows[0].n);
  } catch {
    return 'missing';
  }
}

async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(' drop-dead-schema — kill list cleanup');
  console.log('────────────────────────────────────────────────────────────');
  console.log(` DATABASE_URL : ${maskConn(process.env.DATABASE_URL)}`);
  console.log(` Mode         : ${CONFIRM ? 'APPLY (will mutate)' : 'DRY-RUN'}`);
  console.log('────────────────────────────────────────────────────────────\n');

  console.log(' Current state of targets:');
  for (const t of ['Property', 'Tenant', 'RentPayment', 'LeaseReminder']) {
    const c = await rowCount(t);
    console.log(`   ${t.padEnd(16)} ${c === 'missing' ? 'already gone' : `${c} rows`}`);
  }

  const pmRows = await prisma.adminStaff.count({
    where: { adminRole: 'PROPERTY_MANAGER' },
  }).catch(() => 0);
  console.log(`   AdminStaff PROPERTY_MANAGER: ${pmRows} rows\n`);

  console.log(' Dropping tables:');
  await exec(
    'RentPayment',
    `DROP TABLE IF EXISTS "RentPayment" CASCADE`,
  );
  await exec(
    'LeaseReminder',
    `DROP TABLE IF EXISTS "LeaseReminder" CASCADE`,
  );
  await exec(
    'Tenant',
    `DROP TABLE IF EXISTS "Tenant" CASCADE`,
  );
  await exec(
    'Property',
    `DROP TABLE IF EXISTS "Property" CASCADE`,
  );

  console.log('\n Dropping dead columns (replaced by newer fields):');
  await exec(
    'Debt.autoRemind',
    `ALTER TABLE "Debt" DROP COLUMN IF EXISTS "autoRemind"`,
  );
  await exec(
    'Expense.isPersonal',
    `ALTER TABLE "Expense" DROP COLUMN IF EXISTS "isPersonal"`,
  );
  await exec(
    'Invoice.nrsRetryCount',
    `ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "nrsRetryCount"`,
  );
  await exec(
    'Product.isActive',
    `ALTER TABLE "Product" DROP COLUMN IF EXISTS "isActive"`,
  );

  console.log('\n Cleaning up AdminStaff role values:');
  if (CONFIRM && pmRows > 0) {
    const updated = await prisma.adminStaff.updateMany({
      where: { adminRole: 'PROPERTY_MANAGER' },
      data: { adminRole: 'SUPPORT_AGENT' },
    });
    console.log(`   Re-roled ${updated.count} PROPERTY_MANAGER rows → SUPPORT_AGENT`);
  } else if (!CONFIRM) {
    console.log(`   would re-role ${pmRows} PROPERTY_MANAGER rows → SUPPORT_AGENT (dry-run)`);
  } else {
    console.log('   no PROPERTY_MANAGER rows to clean');
  }

  console.log('\n Cleaning up dead plan strings on User:');
  const deadPlans = ['landlord', 'estate_manager'];
  const planUserCount = await prisma.user.count({ where: { plan: { in: deadPlans } } });
  console.log(`   ${planUserCount} users on dead plan values (landlord/estate_manager)`);
  if (CONFIRM && planUserCount > 0) {
    const updated = await prisma.user.updateMany({
      where: { plan: { in: deadPlans } },
      data: { plan: 'free' },
    });
    console.log(`   Re-planed ${updated.count} users → free`);
  } else if (!CONFIRM) {
    console.log(`   would re-plan to 'free' (dry-run)`);
  }

  console.log('\n Cleaning up dead businessType values on User:');
  const pmBusinessCount = await prisma.user.count({
    where: { businessType: 'property_manager' },
  });
  console.log(`   ${pmBusinessCount} users with businessType='property_manager'`);
  if (CONFIRM && pmBusinessCount > 0) {
    const updated = await prisma.user.updateMany({
      where: { businessType: 'property_manager' },
      data: { businessType: 'seller' },
    });
    console.log(`   Re-typed ${updated.count} users → seller`);
  } else if (!CONFIRM) {
    console.log(`   would re-type to 'seller' (dry-run)`);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(CONFIRM ? ' Done.' : ' DRY-RUN complete. Re-run with CONFIRM_DROP=yes to apply.');
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
