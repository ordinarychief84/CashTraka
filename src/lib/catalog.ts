import { createHash } from 'crypto';

/**
 * Reserved route prefixes — prevents a slug from shadowing real app routes.
 * Anything that exists at `/<segment>` in the App Router goes here.
 */
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'auth',
  'blog', 'billing',
  'contact', 'customers', 'collections', 'checklists',
  'dashboard', 'debts', 'docs',
  'expenses',
  'forgot-password', 'for-business', 'for-landlords',
  'invoices',
  'login',
  'me',
  'new', 'notifications',
  'onboarding',
  'paylinks', 'pay', 'payments', 'pricing', 'privacy', 'products', 'promises', 'properties',
  'r', 'receipts', 'rent', 'reports', 'reset-password',
  'sales', 'sell', 'settings', 'signup', 'staff', 'store', 'support',
  'tasks', 'team', 'templates', 'tenants', 'terms',
  'verify-email',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export type SlugValidationResult = { ok: true } | { ok: false; reason: string };

export function validateSlug(raw: string): SlugValidationResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'Slug must be text.' };
  const slug = raw.trim().toLowerCase();
  if (slug.length < 3) return { ok: false, reason: 'Slug must be at least 3 characters.' };
  if (slug.length > 32) return { ok: false, reason: 'Slug must be 32 characters or fewer.' };
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      reason: 'Use lowercase letters, numbers, and hyphens. No leading/trailing hyphen.',
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: 'That slug is reserved. Pick a different one.' };
  }
  return { ok: true };
}

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Compute the public-facing catalog status for a product.
 * - When trackStock=true: derived from current stock vs lowStockAt.
 * - When trackStock=false: respects the manually-set catalogStatus.
 */
export function productCatalogStatus(p: {
  trackStock: boolean;
  stock: number;
  lowStockAt: number;
  catalogStatus: string;
}): 'AVAILABLE' | 'LOW_STOCK' | 'SOLD_OUT' {
  if (!p.trackStock) {
    if (p.catalogStatus === 'SOLD_OUT' || p.catalogStatus === 'LOW_STOCK') return p.catalogStatus;
    return 'AVAILABLE';
  }
  if (p.stock <= 0) return 'SOLD_OUT';
  if (p.stock <= p.lowStockAt) return 'LOW_STOCK';
  return 'AVAILABLE';
}

/**
 * Privacy-preserving fingerprint for CatalogEvent.ipHash.
 * Rotates daily and is salted with AUTH_SECRET so the same IP across days
 * yields different hashes — rough dedup, no linkability.
 */
export function hashClientIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.AUTH_SECRET || '';
  return createHash('sha256').update(`${ip}|${day}|${salt}`).digest('hex').slice(0, 32);
}

/**
 * Build the WhatsApp message body sent when a customer clicks "Order on WhatsApp".
 * Server returns the full wa.me link; the message lives here so it stays consistent
 * across the public catalog page and any embedded share links.
 */
export function catalogOrderMessage(args: {
  business: string;
  productName: string;
  price: number;
  customerName?: string | null;
  note?: string | null;
}): string {
  const greeting = args.customerName ? `Hi, this is ${args.customerName}.` : 'Hi';
  const lines = [
    `${greeting} I'd like to order from ${args.business}:`,
    `- ${args.productName} — ₦${args.price.toLocaleString('en-NG')}`,
  ];
  if (args.note) lines.push(`Note: ${args.note}`);
  lines.push('Please confirm availability and payment details.');
  return lines.join('\n');
}

/** Trim and length-cap free text from public order forms. */
export function sanitizePublicText(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export const CATALOG_LIMITS = {
  MAX_IMAGES: 8,
  MAX_NAME: 64,
  MAX_NOTE: 280,
  MAX_DESCRIPTION: 2000,
  ORDER_RATE_PER_MIN: 30,
} as const;
