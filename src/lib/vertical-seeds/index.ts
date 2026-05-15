import type { SeedPack } from './types';
import { SKINCARE_PACK } from './packs/skincare';
import { FOOD_PACK } from './packs/food';
import { FASHION_PACK } from './packs/fashion';
import { PRINTING_PACK } from './packs/printing';

/**
 * Registry of all available vertical-seed packs. Order = display order
 * in the picker UI.
 */
const PACKS: SeedPack[] = [SKINCARE_PACK, FOOD_PACK, FASHION_PACK, PRINTING_PACK];

const PACKS_BY_ID = new Map(PACKS.map((p) => [p.id, p]));

export function listPacks(): SeedPack[] {
  return PACKS;
}

export function getPack(id: string): SeedPack | null {
  return PACKS_BY_ID.get(id) ?? null;
}

export type { SeedPack, ApplyResult } from './types';
