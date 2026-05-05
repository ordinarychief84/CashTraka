/**
 * Sentry Node-runtime init (App Router server components, route handlers,
 * server actions, cron). Activates only when SENTRY_DSN is set.
 *
 * We use a SERVER-side env var name (SENTRY_DSN, no NEXT_PUBLIC_ prefix)
 * because the server SDK shouldn't leak the DSN into client bundles. The
 * DSN itself is not a secret — it's a public ingest URL — but keeping
 * the two init paths cleanly separated avoids confusion if you later
 * rotate one without the other.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1,
    // Strip request body from error events. Server requests can carry
    // PII (customer phone, email, payment amount) and we don't want it
    // sitting in Sentry's UI for every developer who can read errors.
    beforeSend(event) {
      if (event.request?.data) {
        delete event.request.data;
      }
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      if (event.request?.headers) {
        // Keep `user-agent` and `host` (useful for triage); drop the rest.
        const headers = event.request.headers as Record<string, string>;
        const safeHeaders: Record<string, string> = {};
        if (headers['user-agent']) safeHeaders['user-agent'] = headers['user-agent'];
        if (headers.host) safeHeaders.host = headers.host;
        event.request.headers = safeHeaders;
      }
      return event;
    },
  });
}
