/**
 * Industry-templated starter data for new tenants.
 *
 * An empty system on day 1 is the #1 churn vector for batch makers —
 * they sign up, see "0 orders" everywhere, and leave. This module
 * defines a one-click "seed me a sample setup" for four common
 * Nigerian small-batch verticals so a brand-new tenant lands in a
 * usable state.
 *
 * Each template includes:
 *   - 1 sample Supplier
 *   - 4-5 sample RawMaterials with sensible reorder levels + kobo costs
 *   - 1 sample finished Product with a kobo selling price
 *   - 1 sample Recipe linking the product to the materials
 *
 * The seed is additive (no destructive writes) and tagged with
 * `notes` so users can easily spot + delete the demo rows when they're
 * ready for their real catalog.
 */

export type IndustryKey = 'skincare' | 'food' | 'fashion' | 'agro';

export type RawMaterialSeed = {
  name: string;
  unit: string;
  stock: number;
  reorderLevel: number;
  unitCostKobo: number;
  /** Quantity of this material needed per unit of the finished product. */
  recipeQuantity: number;
};

export type TemplateSeed = {
  key: IndustryKey;
  label: string;
  emoji: string;
  description: string;
  supplier: {
    name: string;
    phone: string;
  };
  product: {
    name: string;
    priceKobo: number;
    /** Sample on-hand stock. */
    stock: number;
  };
  materials: RawMaterialSeed[];
};

const DEMO_NOTE =
  'Sample data added by CashTraka onboarding template. Safe to edit or delete.';

export const INDUSTRY_TEMPLATES: Record<IndustryKey, TemplateSeed> = {
  skincare: {
    key: 'skincare',
    label: 'Skincare & Body Care',
    emoji: '🧴',
    description:
      'Shea butters, soaps, oils, balms. Seeds materials, a sample butter, and a recipe.',
    supplier: {
      name: 'Lagos Cosmetic Wholesale',
      phone: '+234 803 000 1111',
    },
    product: {
      name: 'Shea Body Butter — 250g',
      priceKobo: 4500_00,
      stock: 0,
    },
    materials: [
      { name: 'Unrefined Shea Butter (kg)', unit: 'kg', stock: 10, reorderLevel: 3, unitCostKobo: 3500_00, recipeQuantity: 200 }, // 200g
      { name: 'Coconut Oil (L)',            unit: 'L',  stock: 5,  reorderLevel: 2, unitCostKobo: 2800_00, recipeQuantity: 1 },   // 1ml/g approximation: 30ml ≈ 1
      { name: 'Vitamin E Oil (ml)',         unit: 'ml', stock: 500, reorderLevel: 100, unitCostKobo: 50_00,  recipeQuantity: 5 },
      { name: 'Glass Jar — 250g',           unit: 'unit', stock: 50, reorderLevel: 20, unitCostKobo: 350_00, recipeQuantity: 1 },
      { name: 'Custom Label',               unit: 'unit', stock: 100, reorderLevel: 40, unitCostKobo: 80_00,  recipeQuantity: 1 },
    ],
  },
  food: {
    key: 'food',
    label: 'Food Processing',
    emoji: '🍯',
    description:
      'Peanut butter, jams, sauces, baked goods. Seeds materials and a sample jar.',
    supplier: {
      name: 'Mile 12 Bulk Foods',
      phone: '+234 803 000 2222',
    },
    product: {
      name: 'Premium Peanut Butter — 350g jar',
      priceKobo: 3200_00,
      stock: 0,
    },
    materials: [
      { name: 'Roasted Peanuts (kg)',       unit: 'kg',   stock: 25, reorderLevel: 10, unitCostKobo: 1800_00, recipeQuantity: 300 }, // 300g
      { name: 'Salt (kg)',                  unit: 'kg',   stock: 2,  reorderLevel: 1,  unitCostKobo: 500_00,  recipeQuantity: 2 },   // 2g
      { name: 'Honey (L)',                  unit: 'L',    stock: 1,  reorderLevel: 1,  unitCostKobo: 8000_00, recipeQuantity: 10 },  // 10ml
      { name: 'Glass Jar — 350g',           unit: 'unit', stock: 60, reorderLevel: 25, unitCostKobo: 280_00,  recipeQuantity: 1 },
      { name: 'Branded Label + Seal',       unit: 'unit', stock: 120, reorderLevel: 50, unitCostKobo: 120_00, recipeQuantity: 1 },
    ],
  },
  fashion: {
    key: 'fashion',
    label: 'Fashion & Tailoring',
    emoji: '👗',
    description:
      'Made-to-measure dresses, abayas, shirts. Seeds fabric + accessories and a sample piece.',
    supplier: {
      name: 'Balogun Market Textiles',
      phone: '+234 803 000 3333',
    },
    product: {
      name: 'Ankara Day Dress — M',
      priceKobo: 15000_00,
      stock: 0,
    },
    materials: [
      { name: 'Ankara Fabric (yards)',      unit: 'yard', stock: 30, reorderLevel: 10, unitCostKobo: 2500_00, recipeQuantity: 5 },   // 5 yards
      { name: 'Lining Fabric (yards)',      unit: 'yard', stock: 20, reorderLevel: 8,  unitCostKobo: 800_00,  recipeQuantity: 2 },
      { name: 'Thread Spool',               unit: 'unit', stock: 50, reorderLevel: 15, unitCostKobo: 200_00,  recipeQuantity: 1 },
      { name: 'Zipper (cm)',                unit: 'cm',   stock: 1000, reorderLevel: 200, unitCostKobo: 8_00, recipeQuantity: 35 },
      { name: 'Buttons (pack of 6)',        unit: 'pack', stock: 25, reorderLevel: 10, unitCostKobo: 250_00,  recipeQuantity: 1 },
    ],
  },
  agro: {
    key: 'agro',
    label: 'Agro-Processing',
    emoji: '🌾',
    description:
      'Garri, pepper, palm oil, milled grains. Seeds raw produce + packaging.',
    supplier: {
      name: 'Mile 2 Agro Suppliers',
      phone: '+234 803 000 4444',
    },
    product: {
      name: 'Yellow Garri — 5kg bag',
      priceKobo: 7500_00,
      stock: 0,
    },
    materials: [
      { name: 'Fresh Cassava Tubers (kg)',  unit: 'kg',   stock: 500, reorderLevel: 100, unitCostKobo: 80_00, recipeQuantity: 18 },  // 18kg fresh → 5kg garri
      { name: 'Palm Oil (L)',               unit: 'L',    stock: 5,  reorderLevel: 2,    unitCostKobo: 3500_00, recipeQuantity: 1 },  // 1 cup
      { name: 'Salt (kg)',                  unit: 'kg',   stock: 5,  reorderLevel: 2,    unitCostKobo: 500_00,  recipeQuantity: 1 },
      { name: '5kg Polythene Bag',          unit: 'unit', stock: 80, reorderLevel: 30,   unitCostKobo: 250_00, recipeQuantity: 1 },
      { name: 'Branded Sticker',            unit: 'unit', stock: 150, reorderLevel: 50,  unitCostKobo: 50_00,   recipeQuantity: 1 },
    ],
  },
};

/** Demo-data marker used so users can easily identify seeded rows. */
export const TEMPLATE_DEMO_NOTE = DEMO_NOTE;

export function getTemplate(key: string): TemplateSeed | null {
  return INDUSTRY_TEMPLATES[key as IndustryKey] ?? null;
}

export function listTemplates(): TemplateSeed[] {
  return Object.values(INDUSTRY_TEMPLATES);
}
