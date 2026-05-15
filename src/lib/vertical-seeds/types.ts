/**
 * Vertical-pack data contract. One pack = a sector-specific bundle of
 * materials + products + recipes that a brand-new tenant can apply in
 * one click so the dashboards aren't empty on day 1.
 *
 * The shapes here are intentionally narrow — no Prisma types leak so
 * the pack files themselves can stay editable by non-engineers.
 *
 * Money fields are kobo (Int). Units are free-form labels ("g", "ml",
 * "L", "unit") — same convention as RawMaterial.unit.
 */

export type SeedMaterial = {
  /** Display name. Used as the natural key for idempotency. */
  name: string;
  /** Unit label printed on the material card (g, ml, L, unit, etc.). */
  unit: string;
  /** Maps to RawMaterial.materialType. Free-form for now, but stick to one of these. */
  materialType: 'INGREDIENT' | 'PACKAGING' | 'COMPONENT' | 'CONSUMABLE' | 'OTHER';
  /** Free-text grouping shown in filter UI. */
  category?: string;
  /** Per-unit cost in kobo (₦4.50/g = 450). */
  unitCostKobo: number;
  /** Stock falls below this → low-stock alert + auto-PO eligibility. */
  reorderLevel: number;
  /** Cap for the auto-PO quantity-to-order math. */
  minimumPurchaseQuantity?: number;
  /** Days from PO sent → stock received. Defaults applied at apply-time. */
  expectedLeadTimeDays?: number;
};

export type SeedProduct = {
  /** Display name. Used as natural key + linked-by-name from recipes. */
  name: string;
  /** Optional SKU code. */
  sku?: string;
  /** Selling price in kobo. */
  priceKobo: number;
  /** Cost-of-goods estimate in kobo (used for margin %). */
  costKobo?: number;
  /** Low-stock alert threshold for finished goods. */
  lowStockAt?: number;
  /** Category shown in filter UI. */
  category?: string;
  /** When true, the product is shippable as a production order line. */
  canBeProduced?: boolean;
  /** Suggested batch size for production templates. */
  defaultBatchSize?: number;
};

export type SeedRecipeItem = {
  /** Must match a SeedMaterial.name in the same pack. */
  materialName: string;
  /** Quantity required to produce one Recipe.yieldQty batch. Whole units. */
  quantity: number;
};

export type SeedRecipe = {
  /** Must match a SeedProduct.name in the same pack. */
  productName: string;
  /** One batch yields this many units of the product. */
  yieldQty: number;
  /** Optional production notes (carried into the Recipe.notes column). */
  notes?: string;
  items: SeedRecipeItem[];
};

export type SeedPack = {
  /** URL-safe identifier (used as the API body slug). */
  id: string;
  /** Display label in the picker UI. */
  label: string;
  /** One-liner shown under the label. */
  description: string;
  /** Optional emoji shown beside the pack title. */
  emoji?: string;
  materials: SeedMaterial[];
  products: SeedProduct[];
  recipes: SeedRecipe[];
};

export type ApplyResult = {
  packId: string;
  packLabel: string;
  materialsCreated: number;
  materialsSkipped: number;
  productsCreated: number;
  productsSkipped: number;
  recipesCreated: number;
  recipesSkipped: number;
};
