/**
 * One-shot migration creating the Certificate table for the cert vault.
 * Additive only — no existing tables touched. Idempotent.
 *
 * Run:  npx tsx scripts/create-certificate-table.ts             # dry-run
 *       CONFIRM_CREATE=yes npx tsx scripts/create-certificate-table.ts
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
  console.log(' create-certificate-table');
  console.log(` DATABASE_URL : ${maskConn(process.env.DATABASE_URL)}`);
  console.log(` Mode         : ${CONFIRM ? 'APPLY' : 'DRY-RUN'}`);
  console.log('────────────────────────────────────────────────────────────\n');

  await exec(
    'CREATE TABLE Certificate',
    `CREATE TABLE IF NOT EXISTS "Certificate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "productId" TEXT,
      "label" TEXT NOT NULL,
      "certificateNumber" TEXT,
      "issuedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3),
      "fileUrl" TEXT NOT NULL,
      "mimeType" TEXT,
      "notes" TEXT,
      "publicToken" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Certificate_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "Certificate_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL
    )`,
  );
  await exec(
    'unique Certificate_publicToken',
    `CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_publicToken_key" ON "Certificate"("publicToken")`,
  );
  await exec(
    'idx Certificate_userId_deletedAt',
    `CREATE INDEX IF NOT EXISTS "Certificate_userId_deletedAt_idx" ON "Certificate"("userId","deletedAt")`,
  );
  await exec(
    'idx Certificate_userId_expiresAt',
    `CREATE INDEX IF NOT EXISTS "Certificate_userId_expiresAt_idx" ON "Certificate"("userId","expiresAt")`,
  );
  await exec(
    'idx Certificate_userId_productId',
    `CREATE INDEX IF NOT EXISTS "Certificate_userId_productId_idx" ON "Certificate"("userId","productId")`,
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
