/**
 * Root layout. Mounts once at app start and wraps every screen with:
 *   - SafeAreaProvider     — top/bottom inset awareness
 *   - QueryClientProvider  — TanStack Query
 *   - Sentry init          — runtime error capture
 *   - Auth hydration       — read token from SecureStore and call /me
 *   - Route gate           — redirect to (auth) or (tabs) based on status
 *   - GlobalErrorBoundary  — catches render-time crashes the auto Sentry
 *                            integration would otherwise miss
 *
 * Order matters. Sentry init must run BEFORE the boundary mounts so
 * captured crashes have a working transport.
 */

import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { initSentry, Sentry } from '@/lib/sentry';
import { makeQueryClient } from '@/api/query-client';
import { useAuthStore, wireAuthListener } from '@/stores/auth.store';
import { GlobalErrorBoundary } from '@/components/feature/GlobalErrorBoundary';
import { OfflineQueueBanner } from '@/components/feature/OfflineQueueBanner';
import { useOfflineQueueFlusher } from '@/api/offline-flush';
import { colors } from '@/theme';
import { analytics } from '@/lib/analytics';

// One-time Sentry init. Module scope so it runs before any component
// imports a captureException.
initSentry();
wireAuthListener();

function App() {
  const [queryClient] = useState(() => makeQueryClient());
  // Flushes the offline write queue when connectivity returns + on
  // foreground + every 30s. Mounted once, cleaned up on unmount.
  useOfflineQueueFlusher();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalErrorBoundary>
          <OfflineQueueBanner />
          <RouteGate />
        </GlobalErrorBoundary>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Reads the auth status from the store and redirects between the
 * (auth) and (tabs) groups. Renders a brief splash while hydrating.
 */
function RouteGate() {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    if (status === 'unauthenticated' && !inAuth) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuth) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  // Flush queued analytics events whenever the app foregrounds.
  useEffect(() => {
    void analytics.flush();
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.brand[500]} size="large" />
      </View>
    );
  }
  return <Slot />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Wrap with the auto-Sentry profiler — captures unhandled JS errors
// from any component below this point AND adds touch breadcrumbs.
export default Sentry.wrap(App);
