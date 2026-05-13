/**
 * Sentry init + thin capture wrappers used everywhere the app catches
 * an error. The init runs ONCE from the root layout. After that:
 *
 *   import { reportError } from '@/lib/sentry';
 *   try { ... } catch (e) { reportError(e, { tags: { area: 'orders' } }); }
 *
 * Server-side, the web app uses @sentry/nextjs; here we use
 * @sentry/react-native which auto-wires JS errors, native crashes,
 * unhandled promise rejections, and React error boundaries (when
 * `Sentry.ErrorBoundary` is rendered at the root).
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn =
    (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ||
    process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // Missing DSN is fine in local dev — Sentry shouldn't be a hard dep.
    if (__DEV__) console.warn('[sentry] no DSN; runtime capture disabled');
    return;
  }
  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    // 10% in prod, 100% in dev. PII scrubbing happens server-side via
    // a Sentry project rule, not here — never trust client config to
    // protect user data.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    environment:
      (process.env.EXPO_PUBLIC_ENVIRONMENT as string | undefined) ??
      (__DEV__ ? 'development' : 'production'),
    debug: __DEV__,
    // Drop request/response bodies in breadcrumbs — they contain customer
    // names, phones, and amounts.
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'fetch' || crumb.category === 'xhr') {
        if (crumb.data) {
          delete (crumb.data as Record<string, unknown>).request_body;
          delete (crumb.data as Record<string, unknown>).response_body;
        }
      }
      return crumb;
    },
  });
  initialized = true;
}

export function reportError(
  err: unknown,
  context?: {
    tags?: Record<string, string>;
    extras?: Record<string, unknown>;
    user?: { id: string; email?: string };
  },
) {
  if (!initialized) {
    if (__DEV__) console.error('[sentry/uninit]', err, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
    }
    if (context?.extras) {
      for (const [k, v] of Object.entries(context.extras)) scope.setExtra(k, v);
    }
    if (context?.user) scope.setUser(context.user);
    Sentry.captureException(err);
  });
}

export function setSentryUser(user: { id: string; email?: string } | null) {
  if (!initialized) return;
  Sentry.setUser(user);
}

export { Sentry };
