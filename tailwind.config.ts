import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CashTraka brand — Deep Green ramp centered on #0F6F4F
        brand: {
          50:  '#E8F3EE',
          100: '#C9E4D4',
          200: '#93C9A9',
          300: '#5DAE7E',
          400: '#2F9160',
          500: '#0F6F4F', // primary
          600: '#0B5A41',
          700: '#084632',
          800: '#063424',
          900: '#042316',
        },
        // Secondary Success Green for "paid" confirmations — #2ECC71
        success: {
          50:  '#ECFCEF',
          100: '#D3F5DD',
          200: '#A9EBBC',
          300: '#7EE19B',
          400: '#54D77A',
          500: '#2ECC71',
          600: '#27AE60',
          700: '#1E8A4D',
          800: '#166A3A',
          900: '#0E4B28',
        },
        // Lime accent — used for CTAs and active-state highlights on the new
        // dashboard. Pair with dark slate backgrounds for pop.
        lime: {
          50:  '#F7FBE7',
          100: '#EEF6CC',
          200: '#DEEF9B',
          300: '#CEE868',
          400: '#C0E24A',
          500: '#AEDC2A',
          600: '#8EB91F',
          700: '#6D8E17',
        },
        // Owed / alerts — amber #F59E0B (matches Tailwind's built-in amber-500,
        // aliased here so intent is obvious at the call site).
        owed: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        // Neutrals
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
