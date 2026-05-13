import { View, Pressable, StyleSheet } from 'react-native';
import type { ViewProps, PressableProps } from 'react-native';
import { colors, radius, spacing, shadow } from '@/theme';

type Props = ViewProps & {
  /** Pressable card. If onPress is set, the card becomes touchable. */
  onPress?: PressableProps['onPress'];
  /** Drop shadow + slight elevation. Default true. */
  elevated?: boolean;
};

/**
 * Generic surface for grouping content. Composes with Pressable when
 * `onPress` is provided. No business styling — keep these primitive.
 */
export function Card({
  children,
  onPress,
  elevated = true,
  style,
  ...rest
}: Props) {
  const inner = (
    <View
      style={[styles.card, elevated && shadow.sm, style]}
      accessibilityRole={onPress ? 'button' : undefined}
      {...rest}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
