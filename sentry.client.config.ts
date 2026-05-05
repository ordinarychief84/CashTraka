/**
 * Sentry browser-side init.
 *
 * Activates only when NEXT_PUBLIC_SENTRY_DSN is set. Without the DSN this
 * file is a no-op so we can ship Sentry instrumentation everywhere
 * unconditionally and turn it on by setting one Vercel env var.
 *
 * The instrumentation lives in three sibling files (client / server /
 * edge) per Next.js 14's runtime split. instrumentation.ts wires them
 * together via the official `register()` hook.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    // Sample 10% of transactions in production. Adjust based on traffic
    // volume and Sentry quota. 100% in dev so we see everything locally.
    tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1,
    // Don't ship session replays — they record customer screens including
    // money figures and customer names. Privacy-by-default.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Filter benign noise that pollutes the Sentry feed without being
    // actionable. Add to this list as you discover them.
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network races on slow connections — already handled by retry UX
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      // Service worker chatter
      'WorkboxError',
    ],
  });
}
