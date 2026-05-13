import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, spacing, typography } from '@/theme';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.root}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.body}>
          The screen you were looking for has moved or doesn't exist.
        </Text>
        <Link href="/(tabs)" asChild>
          <Button label="Back to dashboard" />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: spacing.lg,
  },
  title: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
