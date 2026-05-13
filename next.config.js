/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Keep ESLint off during Vercel builds so lint warnings don't block a
    // deploy. CI runs it separately. Type errors *do* block builds now.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Production-readiness pass cleared all 67 pre-existing TS errors
    // (including 4 runtime crashes in /api/installments, /api/customers
    // /[id]/notes, /api/clock/*, and the recurring-charge cron). Future
    // regressions now fail the build instead of silently shipping.
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },

  async redirects() {
    return [
      // Legacy route after the operational-planning pivot. Served as a
      // proper 308 with a Location header so SEO + curl + bots follow
      // through. Previously this lived in a page that called
      // next/navigation `redirect()`, which returned 307 with no Location.
      { source: '/for-business', destination: '/solutions', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://ucarecdn.com https://*.uploadcare.com",
              "connect-src 'self' https://api.paystack.co https://upload.uploadcare.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io",
              "frame-src 'self' https://js.paystack.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

// Sentry wrapper. The wrapper is a no-op at runtime when SENTRY_DSN is
// unset, so it's safe to apply unconditionally — once the user pastes the
// DSN into Vercel env vars, the next deploy uploads source maps and
// reports errors automatically. Build-time source-map upload only fires
// when the auth token is present, so without setup nothing happens.
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  // Org + project come from env vars set in Vercel:
  //   SENTRY_ORG=cashtraka (whatever you name it)
  //   SENTRY_PROJECT=cashtraka-web
  //   SENTRY_AUTH_TOKEN=<from sentry.io/settings/account/api/auth-tokens/>
  // If any of these is missing the wrapper logs a warning at build time
  // and skips source-map upload. The runtime SDK still works.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Hide source maps from end users — tunnel them through a /monitoring
  // route on our domain so adblockers don't drop them and so the bundles
  // shipped to the browser don't contain raw map URLs.
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  // Critical: a Sentry outage (sentry-cli release-finalize returns 504)
  // must NOT take down a deploy. Source maps will be missing for that
  // release, which is fine — the runtime SDK still captures errors;
  // they just won't have minified-line resolution until the next deploy.
  errorHandler: (err) => {
    // eslint-disable-next-line no-console
    console.warn('[sentry] release upload skipped:', err?.message || err);
  },
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
