import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { userMessage } from '@/lib/errors';
import { colors, spacing, typography } from '@/theme';
import { analytics } from '@/lib/analytics';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      analytics.track('user_logged_in');
      // _layout effect redirects when status flips to authenticated.
    } catch (err) {
      const msg = userMessage(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to plan production, track materials, and manage orders.
        </Text>
      </View>

      <View style={styles.form}>
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
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          error={error}
        />
        <Link href="/(auth)/forgot-password" style={styles.forgot}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Link>

        <Button label="Sign in" loading={submitting} onPress={onSubmit} fullWidth />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to CashTraka?</Text>
        <Link href="/(auth)/signup">
          <Text style={styles.footerLink}>Create an account</Text>
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
  forgot: { alignSelf: 'flex-end' },
  forgotText: { ...typography.smallBold, color: colors.brand[700] },
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
