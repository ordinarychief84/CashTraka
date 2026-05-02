// Post-deploy schema sync for CashTraka.
//
// When to run:
//   After a deploy that introduces new tables or columns to prisma/schema.prisma.
//   The Vercel build runs `prisma generate && next build` (no `prisma db push`,
//   because production has legacy columns that aren't in the schema and `db push`
//   refuses without --accept-data-loss). So new schema bits are reconciled at
//   runtime via the idempotent /api/migrate endpoint.
//
// Run:
//   node scripts/post-deploy-migrate.mjs           # uses Vercel CLI for CRON_SECRET
//   npm run migrate:prod                           # same, via npm script
//   CRON_SECRET=xxx node scripts/post-deploy-migrate.mjs   # if you already have it
//   MIGRATE_URL=https://staging.example.com/api/migrate node scripts/post-deploy-migrate.mjs
//
// Exit codes: 0 success, 1 anything else (so CI / git hooks can gate on it).

import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import https from 'node:https';
import { URL as URLClass } from 'node:url';

const URL = process.env.MIGRATE_URL || 'https://www.cashtraka.co/api/migrate';

function loadSecret() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;

  console.log('→ CRON_SECRET not in env — pulling from Vercel...');
  const tmpFile = join(tmpdir(), `vercel-env-${Date.now()}-${process.pid}.tmp`);
  try {
    execSync(`vercel env pull --environment=production --yes "${tmpFile}"`, {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const env = readFileSync(tmpFile, 'utf-8');
    const match = env.match(/^CRON_SECRET="?([^"\n]+)"?/m);
    if (!match) throw new Error('CRON_SECRET not present in production env');
    return match[1];
  } catch (e) {
    console.error('Could not load CRON_SECRET. Either:');
    console.error('  • set it in your shell:  export CRON_SECRET=…');
    console.error('  • or install Vercel CLI:  npm i -g vercel  &&  vercel login');
    console.error(`  (underlying error: ${e.message})`);
    process.exit(1);
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

const secret = loadSecret();

console.log(`→ GET ${URL}`);

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URLClass(url);
    const req = https.request(
      {
        method: 'GET',
        host: u.host,
        path: u.pathname + u.search,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf-8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

const res = await httpGet(URL, { Authorization: `Bearer ${secret}` });

if (res.status >= 300 && res.status < 400) {
  console.error(
    `Got HTTP ${res.status} redirect to ${res.headers.location}. Authorization headers don't survive redirects — set MIGRATE_URL to the canonical host (e.g. include www.).`,
  );
  process.exit(1);
}

if (res.status === 401) {
  console.error('HTTP 401 — CRON_SECRET is wrong or stale.');
  process.exit(1);
}

const text = res.body;
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error(`HTTP ${res.status} but body was not JSON:\n${text.slice(0, 500)}`);
  process.exit(1);
}

const fails = json.failures ?? 0;
const total = json.totalColumns ?? 0;
console.log(
  `→ HTTP ${res.status}   totalColumns=${total}   failures=${fails}   finalTest=${json.finalTest}`,
);

if (fails > 0) {
  console.error('\nFailures:');
  for (const line of json.migration || []) {
    if (line.startsWith('FAIL')) console.error(`  ${line}`);
  }
  console.error(
    '\nKnown-acceptable failures: anything mentioning ClockEntry (table not in production).',
  );
  // The ClockEntry-related failures are pre-existing / harmless. Only fail the
  // script when there are non-ClockEntry failures.
  const realFailures = (json.migration || []).filter(
    (l) => l.startsWith('FAIL') && !l.includes('ClockEntry'),
  );
  if (realFailures.length === 0) {
    console.log('\n✓ Only known-acceptable failures — treating as success.');
    process.exit(0);
  }
  process.exit(1);
}

console.log('✓ All schema columns/tables in sync.');
// Force clean exit — undici/fetch can otherwise keep the event loop hanging on
// Windows and produce a libuv teardown crash with non-zero exit code.
process.exit(0);
