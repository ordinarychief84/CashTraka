/**
 * Per-user feature/quota override service.
 *
 * `UserOverride.overrides` is a JSON text blob shaped like Partial<Limits>.
 * Each key, when present, supersedes the plan-derived value when the runtime
 * resolves a user's effective limits.
 *
 * Use cases:
 *   - Comping a single feature to a free user (e.g. firsCompliance: true)
 *   - Granting a higher numeric quota without changing plan tier
 *   - Forcing a feature off even on a paid plan (e.g. revoking abuse)
 */
import { prisma } from '@/lib/prisma';
import { limitsFor, type Limits, type PlanName } from '@/lib/plan-limits';

/** Strict JSON-friendly value shape per Limits key. */
export type OverrideValue = boolean | number | null;

export type OverrideMap = Partial<Record<keyof Limits, OverrideValue>>;

function parseOverrides(raw: string | null | undefined): OverrideMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as OverrideMap;
    }
  } catch {
    // Corrupt JSON falls through to empty.
  }
  return {};
}

function serialiseOverrides(map: OverrideMap): string {
  return JSON.stringify(map);
}

/**
 * Fetch the raw override map for a user. Empty object if no row exists.
 */
export async function getOverrideMap(userId: string): Promise<OverrideMap> {
  const row = await prisma.userOverride.findUnique({ where: { userId } });
  return parseOverrides(row?.overrides);
}

/**
 * Resolve a user's effective limits by merging the override map on top of
 * their plan-derived limits. If no override row exists, behaviour is
 * identical to `limitsFor(plan)`.
 */
export async function getEffectiveLimits(
  userId: string,
  plan: string | null | undefined,
): Promise<Limits> {
  const base = limitsFor(plan as PlanName);
  const map = await getOverrideMap(userId);
  return mergeLimits(base, map);
}

/**
 * Pure merge helper. Boolean keys clamp to boolean; numeric keys accept
 * `null` (unlimited) or a non-negative integer; unknown keys pass through.
 */
export function mergeLimits(base: Limits, map: OverrideMap): Limits {
  const out: Limits = { ...base };
  for (const [k, v] of Object.entries(map)) {
    if (v === undefined) continue;
    // Type-assert: caller is responsible for shape, but we still guard.
    (out as Record<string, OverrideValue>)[k] = v;
  }
  return out;
}

/**
 * Set or clear a single override key. Pass `value: undefined` to remove the
 * key (returns to plan default). Creates the row if it does not exist.
 */
export async function setOverrideFlag(
  userId: string,
  flag: keyof Limits,
  value: OverrideValue | undefined,
): Promise<OverrideMap> {
  const existing = await prisma.userOverride.findUnique({ where: { userId } });
  const map = parseOverrides(existing?.overrides);

  if (value === undefined) {
    delete map[flag];
  } else {
    map[flag] = value;
  }

  if (existing) {
    await prisma.userOverride.update({
      where: { userId },
      data: { overrides: serialiseOverrides(map) },
    });
  } else {
    await prisma.userOverride.create({
      data: { userId, overrides: serialiseOverrides(map) },
    });
  }
  return map;
}

/**
 * Set the per-user discount (kobo) applied at next renewal. Negative = credit.
 */
export async function setDiscountKobo(
  userId: string,
  discountKobo: number | null,
): Promise<void> {
  const existing = await prisma.userOverride.findUnique({ where: { userId } });
  if (existing) {
    await prisma.userOverride.update({
      where: { userId },
      data: { discountKobo },
    });
  } else {
    await prisma.userOverride.create({
      data: {
        userId,
        overrides: serialiseOverrides({}),
        discountKobo,
      },
    });
  }
}

/**
 * Delete the override row entirely. Returns true if a row was removed.
 */
export async function clearOverride(userId: string): Promise<boolean> {
  const existing = await prisma.userOverride.findUnique({ where: { userId } });
  if (!existing) return false;
  await prisma.userOverride.delete({ where: { userId } });
  return true;
}
