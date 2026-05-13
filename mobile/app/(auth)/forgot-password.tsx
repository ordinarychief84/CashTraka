import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { userMessage } from '@/lib/errors';
import { colors, spacing, typography } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim()) return setError('Enter your email.');
    setSubmitting(true);
    try {
      await apiFetch(endpoints.forgotPassword(), {
        method: 'POST',
        anonymous: true,
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          {sent
            ? "If that email matches an account, we sent a reset link. Check your inbox."
            : "Enter the email on your CashTraka account. We'll email a reset link."}
        </Text>
      </View>

      {!sent && (
        <View style={styles.form}>
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@business.com"
            error={error}
          />
          <Button label="Send reset link" loading={submitting} onPress={onSubmit} fullWidth />
        </View>
      )}

      <View style={styles.footer}>
        <Link href="/(auth)/login">
          <Text style={styles.footerLink}>Back to sign in</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing['2xl'], gap: spacing.sm },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  form: { marginTop: spacing['2xl'], gap: spacing.lg },
  footer: { marginTop: 'auto', alignItems: 'center' },
  footerLink: { ...typography.bodyBold, color: colors.brand[700] },
});
