/**
 * One-shot migration creating CustomerOrderSubscription. Additive,
 * idempotent. Safe to re-run.
 *
 * Run:  npx tsx scripts/create-subscriptions-table.ts                # dry-run
 *       CONFIRM_CREATE=yes npx tsx scripts/create-subscriptions-table.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CONFIRM = process.env.CONFIRM_CREATE === 'yes';

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

async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(' create-subscriptions-table');
  console.log(` Mode : ${CONFIRM ? 'APPLY' : 'DRY-RUN'}`);
  console.log('────────────────────────────────────────────────────────────\n');

  await exec(
    'CREATE TABLE CustomerOrderSubscription',
    `CREATE TABLE IF NOT EXISTS "CustomerOrderSubscription" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "cadence" TEXT NOT NULL,
      "itemsJson" TEXT NOT NULL,
      "nextRunAt" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "endsAt" TIMESTAMP(3),
      "lastRunAt" TIMESTAMP(3),
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "CustomerOrderSubscription_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "CustomerOrderSubscription_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
    )`,
  );
  await exec(
    'idx CustomerOrderSubscription_userId_status_nextRunAt',
    `CREATE INDEX IF NOT EXISTS "CustomerOrderSubscription_userId_status_nextRunAt_idx"
     ON "CustomerOrderSubscription"("userId","status","nextRunAt")`,
  );
  await exec(
    'idx CustomerOrderSubscription_customerId',
    `CREATE INDEX IF NOT EXISTS "CustomerOrderSubscription_customerId_idx"
     ON "CustomerOrderSubscription"("customerId")`,
  );

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(CONFIRM ? ' Done.' : ' DRY-RUN complete.');
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
