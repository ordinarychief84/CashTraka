/**
 * African-first currency catalog used by the Add-currency picker
 * under Settings > Currencies.
 *
 * Section ordering is deliberate: Nigerian Naira is the runtime
 * default for CashTraka, so it leads the list. After NGN, the
 * other ECOWAS / East / Southern / North African currencies sit
 * together so a Nigerian seller dealing across the continent finds
 * common counterparties in one block. International reserves (USD,
 * EUR, GBP) trail because every African business eventually
 * invoices in those too.
 *
 * Sample rates are placeholders — sellers set the real rate when
 * they add the currency. They are NOT auto-refreshed by any
 * upstream feed (yet).
 */

export interface CurrencyOption {
  code: string;
  name: string;
  symbol?: string;
  region: 'West Africa' | 'East Africa' | 'Southern Africa' | 'North Africa' | 'Central Africa' | 'International';
  /** Approximate rate vs NGN; used as a friendly starting value. */
  sampleRateVsNgn?: number;
}

export const CURRENCY_CATALOG: CurrencyOption[] = [
  // West Africa — Nigeria first
  { code: 'NGN', name: 'Nigerian Naira',        symbol: '₦',   region: 'West Africa', sampleRateVsNgn: 1 },
  { code: 'GHS', name: 'Ghanaian Cedi',         symbol: 'GH₵', region: 'West Africa', sampleRateVsNgn: 0.067 },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', region: 'West Africa', sampleRateVsNgn: 0.36 },
  { code: 'SLL', name: 'Sierra Leonean Leone',  symbol: 'Le',  region: 'West Africa', sampleRateVsNgn: 13.5 },
  { code: 'LRD', name: 'Liberian Dollar',       symbol: 'L$',  region: 'West Africa', sampleRateVsNgn: 0.107 },
  { code: 'GMD', name: 'Gambian Dalasi',        symbol: 'D',   region: 'West Africa', sampleRateVsNgn: 0.044 },
  { code: 'GNF', name: 'Guinean Franc',         symbol: 'FG',  region: 'West Africa', sampleRateVsNgn: 5.7 },
  { code: 'CVE', name: 'Cape Verdean Escudo',   symbol: '$',   region: 'West Africa', sampleRateVsNgn: 0.064 },

  // East Africa
  { code: 'KES', name: 'Kenyan Shilling',       symbol: 'KSh', region: 'East Africa', sampleRateVsNgn: 0.085 },
  { code: 'UGX', name: 'Ugandan Shilling',      symbol: 'USh', region: 'East Africa', sampleRateVsNgn: 2.4 },
  { code: 'TZS', name: 'Tanzanian Shilling',    symbol: 'TSh', region: 'East Africa', sampleRateVsNgn: 1.65 },
  { code: 'RWF', name: 'Rwandan Franc',         symbol: 'R₣',  region: 'East Africa', sampleRateVsNgn: 0.87 },
  { code: 'ETB', name: 'Ethiopian Birr',        symbol: 'Br',  region: 'East Africa', sampleRateVsNgn: 0.080 },
  { code: 'BIF', name: 'Burundian Franc',       symbol: 'FBu', region: 'East Africa', sampleRateVsNgn: 1.85 },
  { code: 'DJF', name: 'Djiboutian Franc',      symbol: 'Fdj', region: 'East Africa', sampleRateVsNgn: 0.115 },
  { code: 'SOS', name: 'Somali Shilling',       symbol: 'Sh.', region: 'East Africa', sampleRateVsNgn: 0.37 },

  // Southern Africa
  { code: 'ZAR', name: 'South African Rand',    symbol: 'R',   region: 'Southern Africa', sampleRateVsNgn: 0.012 },
  { code: 'BWP', name: 'Botswana Pula',         symbol: 'P',   region: 'Southern Africa', sampleRateVsNgn: 0.009 },
  { code: 'NAD', name: 'Namibian Dollar',       symbol: 'N$',  region: 'Southern Africa', sampleRateVsNgn: 0.012 },
  { code: 'ZMW', name: 'Zambian Kwacha',        symbol: 'ZK',  region: 'Southern Africa', sampleRateVsNgn: 0.014 },
  { code: 'ZWL', name: 'Zimbabwean Dollar',     symbol: 'Z$',  region: 'Southern Africa', sampleRateVsNgn: 0.18 },
  { code: 'MWK', name: 'Malawian Kwacha',       symbol: 'MK',  region: 'Southern Africa', sampleRateVsNgn: 1.04 },
  { code: 'MZN', name: 'Mozambican Metical',    symbol: 'MT',  region: 'Southern Africa', sampleRateVsNgn: 0.041 },
  { code: 'LSL', name: 'Lesotho Loti',          symbol: 'L',   region: 'Southern Africa', sampleRateVsNgn: 0.012 },
  { code: 'SZL', name: 'Swazi Lilangeni',       symbol: 'E',   region: 'Southern Africa', sampleRateVsNgn: 0.012 },
  { code: 'AOA', name: 'Angolan Kwanza',        symbol: 'Kz',  region: 'Southern Africa', sampleRateVsNgn: 0.59 },

  // Central Africa
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', region: 'Central Africa', sampleRateVsNgn: 0.36 },
  { code: 'CDF', name: 'Congolese Franc',       symbol: 'FC',  region: 'Central Africa', sampleRateVsNgn: 1.92 },
  { code: 'STN', name: 'São Tomé Dobra',        symbol: 'Db',  region: 'Central Africa', sampleRateVsNgn: 0.015 },

  // North Africa
  { code: 'EGP', name: 'Egyptian Pound',        symbol: '£',   region: 'North Africa', sampleRateVsNgn: 0.032 },
  { code: 'MAD', name: 'Moroccan Dirham',       symbol: 'DH',  region: 'North Africa', sampleRateVsNgn: 0.0066 },
  { code: 'DZD', name: 'Algerian Dinar',        symbol: 'DA',  region: 'North Africa', sampleRateVsNgn: 0.085 },
  { code: 'TND', name: 'Tunisian Dinar',        symbol: 'د.ت', region: 'North Africa', sampleRateVsNgn: 0.0020 },
  { code: 'LYD', name: 'Libyan Dinar',          symbol: 'LD',  region: 'North Africa', sampleRateVsNgn: 0.0031 },
  { code: 'SDG', name: 'Sudanese Pound',        symbol: '£SD', region: 'North Africa', sampleRateVsNgn: 0.38 },
  { code: 'MRU', name: 'Mauritanian Ouguiya',   symbol: 'UM',  region: 'North Africa', sampleRateVsNgn: 0.026 },

  // International reserves
  { code: 'USD', name: 'US Dollar',             symbol: '$',   region: 'International', sampleRateVsNgn: 0.00065 },
  { code: 'EUR', name: 'Euro',                  symbol: '€',   region: 'International', sampleRateVsNgn: 0.00060 },
  { code: 'GBP', name: 'British Pound',         symbol: '£',   region: 'International', sampleRateVsNgn: 0.00051 },
  { code: 'CNY', name: 'Chinese Yuan',          symbol: '¥',   region: 'International', sampleRateVsNgn: 0.0047 },
  { code: 'JPY', name: 'Japanese Yen',          symbol: '¥',   region: 'International', sampleRateVsNgn: 0.099 },
  { code: 'CAD', name: 'Canadian Dollar',       symbol: 'C$',  region: 'International', sampleRateVsNgn: 0.00091 },
  { code: 'AUD', name: 'Australian Dollar',     symbol: 'A$',  region: 'International', sampleRateVsNgn: 0.0010 },
  { code: 'CHF', name: 'Swiss Franc',           symbol: 'CHF', region: 'International', sampleRateVsNgn: 0.00057 },
  { code: 'AED', name: 'UAE Dirham',            symbol: 'د.إ', region: 'International', sampleRateVsNgn: 0.0024 },
  { code: 'SAR', name: 'Saudi Riyal',           symbol: 'ر.س',region: 'International', sampleRateVsNgn: 0.0024 },
  { code: 'INR', name: 'Indian Rupee',          symbol: '₹',   region: 'International', sampleRateVsNgn: 0.055 },
  { code: 'TRY', name: 'Turkish Lira',          symbol: '₺',   region: 'International', sampleRateVsNgn: 0.022 },
];

export const CURRENCY_CODES = CURRENCY_CATALOG.map((c) => c.code);

export function getCurrencyInfo(code: string): CurrencyOption | undefined {
  return CURRENCY_CATALOG.find((c) => c.code === code.toUpperCase());
}
