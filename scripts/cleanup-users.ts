/**
 * scripts/cleanup-users.ts
 *
 * Soft-delete every User EXCEPT admins (role === "ADMIN"). Hard delete is
 * impossible because `DocumentAuditLog.userId` has `onDelete: Restrict`
 * (Nigerian FIRS requires 6-year retention on tax-relevant records), so
 * this sets `User.deletedAt = now()` instead. Auth + queries already
 * filter on `deletedAt IS NULL`, so the user becomes inert.
 *
 * Safety:
 *   1. Dry-run by default. Prints what it WOULD do and exits.
 *   2. To actually mutate, set `CONFIRM_DELETE=yes`.
 *   3. To also reset isSuspended + clear sensitive fields on the deleted
 *      users, set `CLEAR_PII=yes`. Off by default to preserve audit context.
 *   4. Reads `DATABASE_URL` from env. Point it at dev/local first by
 *      running with a `.env.local` that overrides production. Verify the
 *      printed connection target before confirming.
 *
 * Usage (Windows PowerShell):
 *   # dry-run against whatever DATABASE_URL is loaded:
 *   npx tsx scripts/cleanup-users.ts
 *
 *   # actually do it:
 *   $env:CONFIRM_DELETE="yes"; npx tsx scripts/cleanup-users.ts
 *
 *   # also wipe PII (name, email, phone, addresses) on deleted rows:
 *   $env:CONFIRM_DELETE="yes"; $env:CLEAR_PII="yes"; npx tsx scripts/cleanup-users.ts
 *
 * Usage (POSIX):
 *   npx tsx scripts/cleanup-users.ts                                   # dry-run
 *   CONFIRM_DELETE=yes npx tsx scripts/cleanup-users.ts                # apply
 *   CONFIRM_DELETE=yes CLEAR_PII=yes npx tsx scripts/cleanup-users.ts  # + PII wipe
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONFIRM = process.env.CONFIRM_DELETE === 'yes';
const CLEAR_PII = process.env.CLEAR_PII === 'yes';

function maskConnString(url: string | undefined): string {
  if (!url) return '<unset>';
  try {
    const u = new URL(url);
    const host = u.hostname;
    const db = u.pathname.replace(/^\//, '');
    return `${u.protocol}//****@${host}/${db}`;
  } catch {
    return '<unparseable DATABASE_URL>';
  }
}

async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(' CashTraka user cleanup');
  console.log('────────────────────────────────────────────────────────────');
  console.log(` DATABASE_URL : ${maskConnString(process.env.DATABASE_URL)}`);
  console.log(` Mode         : ${CONFIRM ? 'APPLY (will mutate)' : 'DRY-RUN'}`);
  console.log(` Clear PII    : ${CLEAR_PII ? 'YES' : 'no'}`);
  console.log('────────────────────────────────────────────────────────────');

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, name: true, deletedAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (admins.length === 0) {
    console.error('\n  No users with role="ADMIN" found. Refusing to proceed.');
    console.error('  Create an admin first (or update an existing user) before running this script.\n');
    process.exit(2);
  }

  console.log(`\n Admins to KEEP (${admins.length}):`);
  for (const a of admins) {
    const flag = a.deletedAt ? ' [soft-deleted — will be REACTIVATED]' : '';
    console.log(`   - ${a.email}  (${a.name})${flag}`);
  }

  const targets = await prisma.user.findMany({
    where: {
      role: { not: 'ADMIN' },
      deletedAt: null,
    },
    select: { id: true, email: true, name: true, createdAt: true, plan: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n Non-admin users to SOFT-DELETE (${targets.length}):`);
  if (targets.length === 0) {
    console.log('   (none — nothing to do)');
  } else {
    const sample = targets.slice(0, 20);
    for (const u of sample) {
      console.log(`   - ${u.email}  (${u.plan})  created ${u.createdAt.toISOString().slice(0, 10)}`);
    }
    if (targets.length > sample.length) {
      console.log(`   …and ${targets.length - sample.length} more`);
    }
  }

  if (!CONFIRM) {
    console.log('\n DRY-RUN complete. No rows were modified.');
    console.log(' To apply, re-run with CONFIRM_DELETE=yes.\n');
    process.exit(0);
  }

  if (targets.length === 0 && admins.every((a) => !a.deletedAt)) {
    console.log('\n Nothing to do. Exiting clean.\n');
    process.exit(0);
  }

  console.log('\n Applying changes…');
  const now = new Date();

  const reactivatedAdmins = await prisma.user.updateMany({
    where: { role: 'ADMIN', deletedAt: { not: null } },
    data: { deletedAt: null, isSuspended: false },
  });
  if (reactivatedAdmins.count > 0) {
    console.log(`   • Reactivated ${reactivatedAdmins.count} previously soft-deleted admin(s).`);
  }

  const targetIds = targets.map((t) => t.id);
  if (targetIds.length > 0) {
    const soft = await prisma.user.updateMany({
      where: { id: { in: targetIds } },
      data: { deletedAt: now, isSuspended: true },
    });
    console.log(`   • Soft-deleted ${soft.count} user(s).`);

    if (CLEAR_PII) {
      const masked = await prisma.user.updateMany({
        where: { id: { in: targetIds } },
        data: {
          name: 'Deleted user',
          email: '', // unique constraint requires non-null; we hash below
          whatsappNumber: null,
          businessName: null,
          businessAddress: null,
          bankName: null,
          bankAccountNumber: null,
          bankAccountName: null,
          tin: null,
          logoUrl: null,
          slug: null,
          paymentInstructions: null,
          receiptFooter: null,
        },
      });
      console.log(`   • Masked PII on ${masked.count} row(s) (name/contact/bank cleared).`);

      for (const id of targetIds) {
        await prisma.user.update({
          where: { id },
          data: { email: `deleted+${id}@cashtraka.invalid` },
        });
      }
      console.log(`   • Replaced email with deleted+<id>@cashtraka.invalid on ${targetIds.length} row(s).`);
    }
  }

  console.log('\n Done.\n');
}

main()
  .catch((err) => {
    console.error('\n cleanup-users failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
