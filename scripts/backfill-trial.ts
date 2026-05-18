/**
 * scripts/backfill-trial.ts
 *
 * One-shot: grant a 30-day Pro trial to every user account that joined
 * BEFORE the 30-day-trial-on-signup feature landed and never received
 * one.
 *
 * Why this exists:
 *   The 30-day Pro trial was introduced on 2026-05-15 (commit caa4a3e).
 *   Every signup since that day is auto-enrolled. Accounts that joined
 *   before then never got the trial — they sit on plan=free with
 *   trialEndsAt=null, which surfaces as an awkward second-class
 *   experience on /billing and the sidebar plan card.
 *
 * Selection criteria (all must be true):
 *   - User.createdAt < <FEATURE_LAUNCH_AT>  (so only legacy accounts)
 *   - User.deletedAt IS NULL                (skip soft-deleted)
 *   - User.isSuspended = false              (skip suspended)
 *   - User.plan = 'free'                    (skip paying customers)
 *   - User.trialEndsAt IS NULL              (skip anyone with a prior trial)
 *   - User.subscriptionStatus IN ('free', NULL)  (skip lapsed paid plans)
 *
 * For each matching user we set:
 *   plan               = 'pro_monthly'
 *   subscriptionStatus = 'trialing'
 *   trialEndsAt        = now + 30 days
 *
 * Safety:
 *   1. Dry-run by default. Prints the count + a sample of the first 10
 *      affected users and exits.
 *   2. To actually mutate, set `CONFIRM_BACKFILL=yes`.
 *   3. Idempotent: re-running after a successful run is a no-op
 *      (already-trialing users no longer match the WHERE clause).
 *   4. Reads `DATABASE_URL` from env. Verify the printed connection
 *      target before confirming.
 *
 * Usage (Windows PowerShell):
 *   npx tsx scripts/backfill-trial.ts                                     # dry-run
 *   $env:CONFIRM_BACKFILL="yes"; npx tsx scripts/backfill-trial.ts        # commit
 *
 * Usage (POSIX):
 *   npx tsx scripts/backfill-trial.ts
 *   CONFIRM_BACKFILL=yes npx tsx scripts/backfill-trial.ts
 */
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Commit `caa4a3e` ("feat(billing): 30-day free trial, auto-started on
// signup") merged at 2026-05-15 21:18 UTC. Anything older missed it.
const FEATURE_LAUNCH_AT = new Date('2026-05-15T21:18:00.000Z');
const TRIAL_DAYS = 30;

async function main() {
  const confirm = process.env.CONFIRM_BACKFILL === 'yes';
  const dbUrl = process.env.DATABASE_URL ?? '<unset>';

  // Show the connection target so the operator can sanity-check before
  // confirming. Mask the password component so it doesn't end up in logs.
  const masked = dbUrl.replace(/:[^@/]+@/, ':***@');
  console.log(`[backfill-trial] DATABASE_URL = ${masked}`);
  console.log(
    `[backfill-trial] feature launch cutoff = ${FEATURE_LAUNCH_AT.toISOString()}`,
  );
  console.log(`[backfill-trial] dry-run = ${!confirm}`);

  const where: Prisma.UserWhereInput = {
    createdAt: { lt: FEATURE_LAUNCH_AT },
    deletedAt: null,
    isSuspended: false,
    plan: 'free',
    trialEndsAt: null,
    OR: [
      { subscriptionStatus: 'free' },
      // `subscriptionStatus` is a string column with a default value, so
      // genuine NULLs only show up if a legacy row was inserted before the
      // default existed. Include both shapes to be safe.
      { subscriptionStatus: { equals: null as unknown as string } },
    ],
  };

  const total = await prisma.user.count({ where });
  console.log(`[backfill-trial] matched ${total} legacy free user(s)`);

  if (total === 0) {
    console.log('[backfill-trial] nothing to do.');
    return;
  }

  // Show a small sample so the operator can recognise the cohort.
  const sample = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });
  console.log('[backfill-trial] sample of first 10:');
  for (const u of sample) {
    console.log(
      `  ${u.id}  ${u.email.padEnd(40)}  created ${u.createdAt.toISOString()}`,
    );
  }

  if (!confirm) {
    console.log(
      '[backfill-trial] DRY-RUN — no rows mutated. Set CONFIRM_BACKFILL=yes to commit.',
    );
    return;
  }

  // Each user gets their own 30-day window dated from NOW (not from
  // their signup date) so they actually get the full trial today.
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.user.updateMany({
    where,
    data: {
      plan: 'pro_monthly',
      subscriptionStatus: 'trialing',
      trialEndsAt,
    },
  });
  console.log(
    `[backfill-trial] updated ${result.count} user(s); trialEndsAt = ${trialEndsAt.toISOString()}`,
  );
}

main()
  .catch((err) => {
    console.error('[backfill-trial] FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
