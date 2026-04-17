import type { Config } from 'tailwindcss';

/**
 * CashTraka brand tokens.
 *
 * NEW brand identity (built around the circular blue+green logo):
 *
 *   brand    — Cyan/sky BLUE. Primary UI chrome: navbar, links, focus rings,
 *              hero gradients, key UI surfaces.
 *   success  — Lime GREEN (logo bottom half). Action color: primary buttons,
 *              CTAs, paid confirmations, positive deltas.
 *   owed     — Amber. Open debts, warnings, "needs attention".
 *
 * The previous deep-green `brand` and separate `lime` palettes have been
 * retired. Every `brand-*` class in the codebase automatically re-renders
 * blue now; every `success-*` class now renders the logo's lime green.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Primary UI: BLUE ramp around #00B8E8 ──────────────────────────
        brand: {
          50:  '#E6F8FD',
          100: '#C2EEFB',
          200: '#84DCF7',
          300: '#45CBF2',
          400: '#1FC1EE',
          500: '#00B8E8', // primary UI color
          600: '#009BC6',
          700: '#0076A0',
          800: '#00577A',
          900: '#003A52',
        },
        // ─── Actions / paid confirmations: GREEN ramp around #8BD91E ──────
        success: {
          50:  '#F2FBDC',
          100: '#E4F6B2',
          200: '#CFEF83',
          300: '#B4E553',
          400: '#9FDE32',
          500: '#8BD91E', // primary action green (from logo)
          600: '#72B515',
          700: '#588A10',
          800: '#3F610B',
          900: '#2A4108',
        },
        // Alias lime→success so any residual `lime-*` classes in markup still
        // resolve to the new green palette until they're cleaned up.
        lime: {
          50:  '#F2FBDC',
          100: '#E4F6B2',
          200: '#CFEF83',
          300: '#B4E553',
          400: '#9FDE32',
          500: '#8BD91E',
          600: '#72B515',
          700: '#588A10',
        },
        // ─── Owed / alerts: amber (unchanged, spec-approved) ──────────────
        owed: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        // ─── Neutrals (unchanged) ─────────────────────────────────────────
        ink: '#1A1A1A',
        canvas: '#F7F9F8',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '0.25rem',
        sm: '0.375rem',
        base: '0.5rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
