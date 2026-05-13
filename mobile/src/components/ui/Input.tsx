import { forwardRef, useState } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  /** Inline error message shown below the input. */
  error?: string | null;
  /** Optional leading element rendered inside the field. */
  leading?: React.ReactNode;
  /** Optional trailing element. */
  trailing?: React.ReactNode;
};

/**
 * The one text input. Carries a label, an optional inline error, and a
 * focus state. Forwards the underlying TextInput ref so callers can
 * `.focus()` / `.blur()` programmatically.
 */
export const Input = forwardRef<TextInput, Props>(function Input(
  { label, hint, error, leading, trailing, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label} accessibilityLabel={label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { ...typography.smallBold, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  fieldFocused: { borderColor: colors.brand[500] },
  fieldError: { borderColor: colors.danger[500] },
  input: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.text,
  },
  leading: { marginRight: spacing.sm },
  trailing: { marginLeft: spacing.sm },
  hint: { ...typography.small, color: colors.textMuted },
  error: { ...typography.small, color: colors.danger[700] },
});
