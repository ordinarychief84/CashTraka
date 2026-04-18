/**
 * CashTraka Update Script
 * Applies all pending changes: marketing copy, new features, schema fixes
 * Run: node apply-updates.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function replace(filePath, find, replaceWith) {
  const full = path.join(ROOT, filePath);
  let content = fs.readFileSync(full, 'utf8');
  if (\!content.includes(find)) {
    console.log(`  SKIP (pattern not found): ${filePath}`);
    return false;
  }
  content = content.replace(find, replaceWith);
  fs.writeFileSync(full, content, 'utf8');
  console.log(`  OK: ${filePath}`);
  return true;
}

function writeFile(filePath, content) {
  const full = path.join(ROOT, filePath);
  const dir = path.dirname(full);
  if (\!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log(`  CREATED: ${filePath}`);
}

console.log('\n=== 1. Prisma schema: add directUrl ===');
replace('prisma/schema.prisma',
  `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`,
  `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")\n}`
);

// Try Windows line endings too
replace('prisma/schema.prisma',
  `datasource db {\r\n  provider = "postgresql"\r\n  url      = env("DATABASE_URL")\r\n}`,
  `datasource db {\r\n  provider  = "postgresql"\r\n  url       = env("DATABASE_URL")\r\n  directUrl = env("DIRECT_URL")\r\n}`
);

console.log('\n=== 2. .env: add DIRECT_URL ===');
{
  const envPath = path.join(ROOT, '.env');
  let env = fs.readFileSync(envPath, 'utf8');
  if (\!env.includes('DIRECT_URL')) {
    env += '\nDIRECT_URL="postgresql://neondb_owner:npg_HBwnXP85ghqk@ep-aged-recipe-ama0c6ys.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"\n';
    fs.writeFileSync(envPath, env, 'utf8');
    console.log('  OK: .env updated');
  } else {
    console.log('  SKIP: DIRECT_URL already present');
  }
}

console.log('\n=== 3. Middleware: add /paylinks, /collections, CSRF exemptions ===');
replace('src/middleware.ts',
  `  '/checklists',\n  '/team',\n  // Admin`,
  `  '/checklists',\n  '/team',\n  '/paylinks',\n  '/collections',\n  // Admin`
);
replace('src/middleware.ts',
  `  '/checklists',\r\n  '/team',\r\n  // Admin`,
  `  '/checklists',\r\n  '/team',\r\n  '/paylinks',\r\n  '/collections',\r\n  // Admin`
);
replace('src/middleware.ts',
  `const CSRF_EXEMPT_PREFIXES = [\n  '/api/billing/webhook',\n  '/api/payments/claim/',\n];`,
  `const CSRF_EXEMPT_PREFIXES = [\n  '/api/billing/webhook',\n  '/api/payments/claim/',\n  '/api/pay/',\n  '/api/cron/',\n];`
);
replace('src/middleware.ts',
  `const CSRF_EXEMPT_PREFIXES = [\r\n  '/api/billing/webhook',\r\n  '/api/payments/claim/',\r\n];`,
  `const CSRF_EXEMPT_PREFIXES = [\r\n  '/api/billing/webhook',\r\n  '/api/payments/claim/',\r\n  '/api/pay/',\r\n  '/api/cron/',\r\n];`
);

console.log('\n=== 4. Layout: update meta title/description ===');
replace('src/app/layout.tsx',
  `title: 'CashTraka — Know who paid, know who owes',`,
  `title: 'CashTraka — Know who paid. Know who owes. Collect everything.',`
);
replace('src/app/layout.tsx',
  `'CashTraka helps small businesses and landlords track payments, see who owes them, and follow up in seconds.'`,
  `'The #1 payment tracker for Nigerian small businesses and landlords. Track payments, chase debts via WhatsApp, send payment links, issue receipts — all from your phone.'`
);

console.log('\n=== 5. HeroSolutions: update headline and subtext ===');
replace('src/components/marketing/HeroSolutions.tsx',
  `Stop chasing payments.{' '}`,
  `Know who paid. Know who owes.{' '}`
);
replace('src/components/marketing/HeroSolutions.tsx',
  `Start receiving`,
  `Collect everything`
);
replace('src/components/marketing/HeroSolutions.tsx',
  `CashTraka verifies payments against your real bank alert,\n                auto-issues receipts, and chases debts on WhatsApp — built for\n                Nigerian small businesses and landlords.`,
  `CashTraka is the all-in-one payment tracker for Nigerian businesses\n                and landlords. Verify transfers, issue receipts, chase debts on\n                WhatsApp, and send payment links — all from your phone.`
);
replace('src/components/marketing/HeroSolutions.tsx',
  `CashTraka verifies payments against your real bank alert,\r\n                auto-issues receipts, and chases debts on WhatsApp — built for\r\n                Nigerian small businesses and landlords.`,
  `CashTraka is the all-in-one payment tracker for Nigerian businesses\r\n                and landlords. Verify transfers, issue receipts, chase debts on\r\n                WhatsApp, and send payment links — all from your phone.`
);

console.log('\n=== 6. Landing page (page.tsx): update marketing copy ===');
// Problem section
replace('src/app/page.tsx',
  `eyebrow="The problem"`,
  `eyebrow="Sound familiar?"`
);
replace('src/app/page.tsx',
  `title="If you run a business on WhatsApp alone, you're already losing money"`,
  `title="Running your business on WhatsApp alone is costing you real money"`
);
replace('src/app/page.tsx',
  `You are not running a system. You are reacting to messages.`,
  `You are not lazy. You just do not have a system yet.`
);
// Solution section
replace('src/app/page.tsx',
  `eyebrow="The solution"`,
  `eyebrow="Meet CashTraka"`
);
replace('src/app/page.tsx',
  `title="CashTraka gives you control over your sales and cash"`,
  `title="The system your business has been missing"`
);
// How it works
replace('src/app/page.tsx',
  `title="Simple. Fast. Works from day one."`,
  `title="Set up in minutes. See results the same day."`
);
// Value section
replace('src/app/page.tsx',
  `eyebrow="The value"`,
  `eyebrow="The real value"`
);
replace('src/app/page.tsx',
  `title="Make more money without finding new customers"`,
  `title="You do not need more customers — you need to keep the ones you have"`
);
// Objections
replace('src/app/page.tsx',
  `eyebrow="We keep it simple"`,
  `eyebrow="Built for real life"`
);
replace('src/app/page.tsx',
  `title="You do not need another complicated tool"`,
  `title="No learning curve. No complicated software. Just results."`
);
// Pricing
replace('src/app/page.tsx',
  `title="Simple pricing that pays for itself"`,
  `title="One recovered debt pays for a whole year"`
);
// Final CTA
replace('src/app/page.tsx',
  `You already did the hard part. You got the customers.`,
  `Your customers are already there. Your money should be too.`
);
replace('src/app/page.tsx',
  `Now stop losing money from them.`,
  `Join thousands of Nigerian businesses that stopped guessing and started collecting.`
);
replace('src/app/page.tsx',
  `Set up in minutes. See value the same day.`,
  `Free plan available. Set up in under 5 minutes. No card required.`
);

console.log('\n=== 7. About page: rewrite ===');
replace('src/app/about/page.tsx',
  `export const metadata = { title: 'About us — CashTraka' };`,
  `export const metadata = { title: 'About CashTraka — Built for Nigerian businesses that run on trust' };`
);
replace('src/app/about/page.tsx',
  `CashTraka is a simple tool that helps small businesses and landlords in Nigeria\n        know who paid, know who owes, and follow up quickly.`,
  `CashTraka is the payment tracking system built for how Nigerian businesses actually work — on a phone, between WhatsApp messages, sometimes while packing an order.`
);
replace('src/app/about/page.tsx',
  `CashTraka is a simple tool that helps small businesses and landlords in Nigeria\r\n        know who paid, know who owes, and follow up quickly.`,
  `CashTraka is the payment tracking system built for how Nigerian businesses actually work — on a phone, between WhatsApp messages, sometimes while packing an order.`
);

console.log('\n=== 8. HeroICP: update copy ===');
replace('src/components/marketing/HeroICP.tsx',
  `eyebrow: 'WhatsApp Sales & Cash Tracker',`,
  `eyebrow: 'The #1 Payment Tracker for Nigerian Sellers',`
);
replace('src/components/marketing/HeroICP.tsx',
  `headline: 'Stop losing money from customers who haven\\'t paid',`,
  `headline: 'Know who paid. Know who owes. Collect what is yours.',`
);
replace('src/components/marketing/HeroICP.tsx',
  `headline: 'Stop losing money from customers who haven't paid',`,
  `headline: 'Know who paid. Know who owes. Collect what is yours.',`
);

console.log('\n=== DONE ===');
console.log('All changes applied\! Now run:');
console.log('  git add -A');
console.log('  git commit -m "feat: marketing copy + schema directUrl + middleware routes"');
console.log('  git push origin main');
console.log('');
