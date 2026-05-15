import type { SeedPack } from './types';
import { SKINCARE_PACK } from './packs/skincare';

/**
 * Registry of all available vertical-seed packs. New verticals (food,
 * fashion, printing, etc.) get added here once their pack file lands.
 * Order = display order in the picker UI.
 */
const PACKS: SeedPack[] = [SKINCARE_PACK];

const PACKS_BY_ID = new Map(PACKS.map((p) => [p.id, p]));

export function listPacks(): SeedPack[] {
  return PACKS;
}

export function getPack(id: string): SeedPack | null {
  return PACKS_BY_ID.get(id) ?? null;
}

export type { SeedPack, ApplyResult } from './types';
