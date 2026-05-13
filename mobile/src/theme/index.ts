/**
 * Design tokens — single source of truth for colors, type, spacing,
 * radius, shadows. Components consume these directly; they do not
 * hardcode values. Token names match the web app's Tailwind config
 * so the two products read the same.
 *
 * Light only for v0.1. Dark theme is a future flip: the named tokens
 * (e.g. `colors.surface`, `colors.text`) stay; their hex values get
 * swapped behind the `useTheme()` hook.
 */

export const colors = {
  /** Brand cyan family. Primary action buttons, focus, highlights. */
  brand: {
    50: '#E5F8FE',
    100: '#CCF1FD',
    300: '#62D7F4',
    500: '#1FC1EE', // primary
    600: '#00B8E8',
    700: '#0091BC',
    900: '#003A52',
  },
  /** Success / completed / paid. */
  success: {
    50: '#F2FDE6',
    300: '#B3EE6E',
    500: '#8BD91E',
    700: '#5FA20D',
  },
  /** Owed / late / overdue. */
  owed: {
    50: '#FFF2EF',
    500: '#FF7A59',
    700: '#C24830',
  },
  /** Danger / destructive. */
  danger: {
    50: '#FEF2F2',
    500: '#EF4444',
    700: '#B91C1C',
  },
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  border: '#E5E7EB',
  text: '#1A1A1A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
};

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38 },
  h1: { fontSize: 24, fontWeight: '800' as const, lineHeight: 30 },
  h2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: '700' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  smallBold: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.4 },
  mono: { fontFamily: 'Menlo', fontSize: 13, lineHeight: 18 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
};

export const theme = { colors, typography, spacing, radius, shadow };
export type Theme = typeof theme;
