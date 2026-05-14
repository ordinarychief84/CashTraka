/**
 * Typed registry of platform-wide feature flags. Flags are persisted in
 * the `SystemSetting` table (key/value strings) so existing infra and
 * admin tooling already handles them — this file just gives them types,
 * descriptions, and defaults so the admin UI can render a meaningful
 * toggle list instead of arbitrary KV soup.
 *
 * To add a flag:
 *   1. Add an entry below with key/label/description/default.
 *   2. Use `isFeatureEnabled(key)` anywhere in server code.
 *   3. No DB migration needed — flags lazy-create their SystemSetting row.
 */

import { prisma } from './prisma';

export type FeatureFlagKey =
  | 'feature.public_signup'
  | 'feature.production_module'
  | 'feature.firs_real_adapter'
  | 'feature.paystack_live'
  | 'feature.show_pricing_page'
  | 'feature.allow_new_purchases'
  | 'feature.maintenance_banner'
  | 'feature.whatsapp_business_api';

type FlagDef = {
  key: FeatureFlagKey;
  label: string;
  description: string;
  /** When the row is absent, treat the flag as this value. */
  default: boolean;
  /** Optional grouping for the admin UI. */
  group: 'access' | 'product' | 'billing' | 'integrations' | 'site';
};

export const FEATURE_FLAGS: FlagDef[] = [
  {
    key: 'feature.public_signup',
    label: 'Public signup',
    description:
      'When OFF, /signup is blocked and only invited users can join. Useful during private beta or to stop bot signups.',
    default: true,
    group: 'access',
  },
  {
    key: 'feature.production_module',
    label: 'Production planning module',
    description:
      'Master switch for the small-batch ops pivot (customer orders, production, materials, etc.). Off hides the nav entries and disables the API routes.',
    default: true,
    group: 'product',
  },
  {
    key: 'feature.firs_real_adapter',
    label: 'FIRS real adapter',
    description:
      'When OFF, all FIRS submissions use the NoopFIRSAdapter (no real submission). Flip ON once we have a merchant ID.',
    default: false,
    group: 'integrations',
  },
  {
    key: 'feature.paystack_live',
    label: 'Paystack live mode',
    description:
      'When OFF, the Paystack init route refuses to charge real cards and we run in sandbox.',
    default: true,
    group: 'integrations',
  },
  {
    key: 'feature.show_pricing_page',
    label: 'Public /pricing page',
    description:
      'When OFF, /pricing 404s. Useful during onboarding overhauls or while pricing is in flux.',
    default: true,
    group: 'site',
  },
  {
    key: 'feature.allow_new_purchases',
    label: 'Allow new subscription purchases',
    description:
      'When OFF, the upgrade buttons in the app return a "temporarily disabled" error. Existing subscriptions still renew.',
    default: true,
    group: 'billing',
  },
  {
    key: 'feature.maintenance_banner',
    label: 'Sitewide maintenance banner',
    description:
      'When ON, a yellow banner is shown on every authenticated page. The banner text lives in the matching SystemSetting value (set it to the message you want).',
    default: false,
    group: 'site',
  },
  {
    key: 'feature.whatsapp_business_api',
    label: 'WhatsApp Business API intake',
    description:
      'When ON, /api/webhooks/whatsapp accepts inbound messages from Meta and creates draft customer orders. Also requires WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_CLOUD_API_TOKEN env vars. Default OFF — turn on AFTER your number is approved by Meta.',
    default: false,
    group: 'integrations',
  },
];

const flagByKey = new Map(FEATURE_FLAGS.map((f) => [f.key, f]));

export function getFlagDef(key: FeatureFlagKey): FlagDef | undefined {
  return flagByKey.get(key);
}

/**
 * Read a flag's current value from the DB. Returns the registry default
 * when the row is absent or the stored value is malformed.
 */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const def = flagByKey.get(key);
  if (!def) return false;
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return def.default;
  return row.value === 'true';
}

export async function getAllFlagValues(): Promise<Record<FeatureFlagKey, boolean>> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: FEATURE_FLAGS.map((f) => f.key) } },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value === 'true']));
  const out = {} as Record<FeatureFlagKey, boolean>;
  for (const f of FEATURE_FLAGS) {
    out[f.key] = f.key in map ? map[f.key] : f.default;
  }
  return out;
}

export async function setFeatureFlag(key: FeatureFlagKey, value: boolean) {
  if (!flagByKey.has(key)) {
    throw new Error(`Unknown feature flag: ${key}`);
  }
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: value ? 'true' : 'false' },
    update: { value: value ? 'true' : 'false' },
  });
}
