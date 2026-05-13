import { Pressable, ActivityIndicator, Text, StyleSheet, View } from 'react-native';
import type { PressableProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** Visual treatment. Defaults to `primary`. */
  variant?: Variant;
  /** Vertical padding scale. Defaults to `md`. */
  size?: Size;
  /** Shows a spinner and disables press. */
  loading?: boolean;
  /** Optional leading icon node. */
  iconLeft?: React.ReactNode;
  /** Optional trailing icon node. */
  iconRight?: React.ReactNode;
  /** Stretch to full width of its container. */
  fullWidth?: boolean;
};

/**
 * The one button. Every other "button" elsewhere in the app should
 * compose from this one — no second base. Keeps the design system
 * one-thing-at-a-time.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  iconLeft,
  iconRight,
  fullWidth,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const palette = PALETTE[variant];
  const padding = PADDING[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg },
        { borderColor: palette.border ?? 'transparent', borderWidth: palette.border ? 1 : 0 },
        padding,
        fullWidth && styles.full,
        pressed && !isDisabled && { opacity: 0.85 },
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
          <Text style={[styles.label, { color: palette.fg }, LABEL_SIZE[size]]}>
            {label}
          </Text>
          {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const PALETTE: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.brand[500], fg: '#FFFFFF' },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.brand[700] },
  danger: { bg: colors.danger[500], fg: '#FFFFFF' },
};

const PADDING: Record<Size, { paddingHorizontal: number; paddingVertical: number }> = {
  sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md - 2 },
  lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
};

const LABEL_SIZE: Record<Size, { fontSize: number; lineHeight: number }> = {
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 15, lineHeight: 20 },
  lg: { fontSize: 16, lineHeight: 22 },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: spacing.sm },
  iconRight: { marginLeft: spacing.sm },
  label: { ...typography.bodyBold, textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
