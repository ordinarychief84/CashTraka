import { useState } from 'react';
import { View, Text, StyleSheet, Switch, Linking } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { writeSession } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth.store';
import { userMessage } from '@/lib/errors';
import { colors, spacing, typography } from '@/theme';
import { analytics } from '@/lib/analytics';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!name.trim() || !email.trim()) return setError('Name and email are required.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!termsAccepted) return setError('Accept the terms to continue.');

    setSubmitting(true);
    try {
      const result = await apiFetch<{ token: string; user: { id: string; email: string } }>(
        endpoints.signup(),
        {
          method: 'POST',
          anonymous: true,
          body: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            confirmPassword: confirm,
            businessType: 'seller',
            termsAccepted: true,
          },
        },
      );
      await writeSession(result.token);
      analytics.track('user_signed_up');
      // Re-hydrate the store, which pulls fresh /me and redirects.
      await useAuthStore.getState().hydrate();
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Start free</Text>
        <Text style={styles.subtitle}>
          Plan production, track materials, manage orders from one simple system.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Full name"
          autoCapitalize="words"
          autoComplete="name"
          value={name}
          onChangeText={setName}
          placeholder="Ada Eze"
        />
        <Input
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          placeholder="you@business.com"
        />
        <Input
          label="Password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          hint="At least 8 characters."
        />
        <Input
          label="Confirm password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          error={error}
        />

        <View style={styles.terms}>
          <Switch
            value={termsAccepted}
            onValueChange={setTermsAccepted}
            accessibilityLabel="Accept terms and privacy"
          />
          <Text style={styles.termsText}>
            I accept the{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://www.cashtraka.co/terms')}
            >
              Terms
            </Text>{' '}
            and{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://www.cashtraka.co/privacy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        <Button label="Create account" loading={submitting} onPress={onSubmit} fullWidth />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/(auth)/login">
          <Text style={styles.footerLink}>Sign in</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  form: { marginTop: spacing['2xl'], gap: spacing.lg },
  terms: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  termsText: { ...typography.small, color: colors.textMuted, flex: 1 },
  link: { color: colors.brand[700], fontWeight: '600' },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { ...typography.bodyBold, color: colors.brand[700] },
});
