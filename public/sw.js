/**
 * CashTraka service worker.
 *
 * Caching strategy:
 *  - App shell (landing, /login, /signup, /offline, manifest, icons) is
 *    pre-cached during install.
 *  - Static assets (/_next/static/*, images, fonts) use cache-first with
 *    background revalidation.
 *  - HTML page requests use network-first: we prefer fresh HTML but serve
 *    cached copies if the network's gone, and finally fall back to /offline.
 *  - /api/* is NEVER cached — money data must be live.
 *
 * To bust the cache after a release, bump CACHE_VERSION below. The activate
 * handler deletes any cache whose name doesn't match.
 */

const CACHE_VERSION = 'cashtraka-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

const APP_SHELL = [
  '/',
  '/login',
  '/signup',
  '/offline',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// ───────────────────────── lifecycle ─────────────────────────

self.addEventListener('install', (event) => {
  // Best-effort pre-cache — individual failures must not abort install.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: 'same-origin' });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // Asset may not exist yet (e.g. pre-build); skip silently.
          }
        }),
      );
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  // Reap old caches so we don't accumulate forever.
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => \!k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ───────────────────────── helpers ─────────────────────────

function isSameOrigin(url) {
  return new URL(url).origin === self.location.origin;
}

function isNextStatic(url) {
  const { pathname } = new URL(url);
  return pathname.startsWith('/_next/static/');
}

function isAsset(url) {
  const { pathname } = new URL(url);
  return /\.(png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf|css)$/i.test(pathname);
}

function isApiRequest(url) {
  return new URL(url).pathname.startsWith('/api/');
}

function isHtmlRequest(req) {
  return req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');
}

// Stale-while-revalidate for static assets: return cache immediately if
// present, but fire a background fetch to refresh.
async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) {
    // Refresh in the background — don't await.
    fetch(req)
      .then((res) => res.ok && cache.put(req, res.clone()))
      .catch(() => {});
    return hit;
  }
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone()).catch(() => {});
  return res;
}

// Network-first for HTML: try network, fall back to cache, last resort /offline.
async function networkFirst(req) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && req.method === 'GET') {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    const offline = await caches.match('/offline');
    if (offline) return offline;
    return new Response('<\!doctype html><title>Offline</title><h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ───────────────────────── fetch router ─────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET (POST/PATCH/DELETE must always hit the network).
  if (request.method \!== 'GET') return;

  // Ignore cross-origin requests (e.g. Google Fonts CSS we let the browser handle).
  if (\!isSameOrigin(request.url)) return;

  // API requests: network-only, no fallback. Surface a JSON error if offline.
  if (isApiRequest(request.url)) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({ success: false, error: 'You are offline.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    return;
  }

  // Static assets (Next.js built files, images, fonts).
  if (isNextStatic(request.url) || isAsset(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else that looks like an HTML navigation.
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Fall through: let the browser handle whatever remains.
});

// ───────────────────────── messaging ─────────────────────────

// Optional: let the app tell the SW to skip waiting (hot-swap on deploy).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
