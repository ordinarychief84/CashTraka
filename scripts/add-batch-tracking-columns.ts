/**
 * One-shot migration to add batch / lot tracking + NAFDAC fields to
 * existing Product and ProductionOrder tables in prod.
 *
 * Adds (additive, all nullable):
 *   Product:
 *     - nafdacNumber  TEXT
 *     - shelfLifeDays INT
 *
 *   ProductionOrder:
 *     - batchNumber    TEXT
 *     - manufacturedAt TIMESTAMP(3)
 *     - expiresAt      TIMESTAMP(3)
 *
 *   ProductionOrder indexes:
 *     - (userId, batchNumber)  for "find batch BTH-2026-0014"
 *     - (userId, expiresAt)    for "what's expiring this month"
 *
 * Idempotent: every step uses IF NOT EXISTS.
 *
 * Run:  npx tsx scripts/add-batch-tracking-columns.ts            # dry-run
 *       CONFIRM_ADD=yes npx tsx scripts/add-batch-tracking-columns.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CONFIRM = process.env.CONFIRM_ADD === 'yes';

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

function maskConn(url: string | undefined): string {
  if (!url) return '<unset>';
  try {
    const u = new URL(url);
    return `${u.protocol}//****@${u.hostname}${u.pathname}`;
  } catch {
    return '<unparseable>';
  }
}

async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(' add-batch-tracking-columns');
  console.log('────────────────────────────────────────────────────────────');
  console.log(` DATABASE_URL : ${maskConn(process.env.DATABASE_URL)}`);
  console.log(` Mode         : ${CONFIRM ? 'APPLY' : 'DRY-RUN'}`);
  console.log('────────────────────────────────────────────────────────────\n');

  console.log(' Product columns:');
  await exec(
    'Product.nafdacNumber',
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nafdacNumber" TEXT`,
  );
  await exec(
    'Product.shelfLifeDays',
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shelfLifeDays" INTEGER`,
  );

  console.log('\n ProductionOrder columns:');
  await exec(
    'ProductionOrder.batchNumber',
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "batchNumber" TEXT`,
  );
  await exec(
    'ProductionOrder.manufacturedAt',
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "manufacturedAt" TIMESTAMP(3)`,
  );
  await exec(
    'ProductionOrder.expiresAt',
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`,
  );

  console.log('\n ProductionOrder indexes:');
  await exec(
    'idx ProductionOrder_userId_batchNumber',
    `CREATE INDEX IF NOT EXISTS "ProductionOrder_userId_batchNumber_idx"
     ON "ProductionOrder"("userId","batchNumber")`,
  );
  await exec(
    'idx ProductionOrder_userId_expiresAt',
    `CREATE INDEX IF NOT EXISTS "ProductionOrder_userId_expiresAt_idx"
     ON "ProductionOrder"("userId","expiresAt")`,
  );

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(CONFIRM ? ' Done.' : ' DRY-RUN complete. Re-run with CONFIRM_ADD=yes to apply.');
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
