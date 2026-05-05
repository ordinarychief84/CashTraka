/**
 * Next.js 14 instrumentation hook. Wires up Sentry for whichever runtime
 * is currently executing.
 *
 * Activated automatically by Next when this file exists at the project
 * root (it can also live under src/, but root is more standard).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
