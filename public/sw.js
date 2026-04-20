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

const CACHE_VERSION = 'cashtraka-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE = `${CACHE_VERSION}-html`;
const OFFLINE_QUEUE_DB = 'cashtraka-offline-queue';
const OFFLINE_QUEUE_STORE = 'requests';

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
          .filter((k) => !k.startsWith(CACHE_VERSION))
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
    return new Response('<!doctype html><title>Offline</title><h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ───────────────────────── offline queue (IndexedDB) ─────────────

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueRequest(url, method, headers, body) {
  try {
    const db = await openQueueDB();
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_QUEUE_STORE).add({
      url, method, headers, body, timestamp: Date.now(),
    });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch { /* IndexedDB may not be available */ }
}

async function replayQueue() {
  try {
    const db = await openQueueDB();
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(OFFLINE_QUEUE_STORE);
    const items = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();

    const succeeded = [];
    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        if (res.ok || res.status < 500) succeeded.push(item.id);
      } catch { break; /* still offline */ }
    }

    if (succeeded.length > 0) {
      const db2 = await openQueueDB();
      const tx2 = db2.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
      const store2 = tx2.objectStore(OFFLINE_QUEUE_STORE);
      for (const id of succeeded) store2.delete(id);
      await new Promise((res) => { tx2.oncomplete = res; });
      db2.close();
    }

    // Notify all clients about the replayed requests
    if (succeeded.length > 0) {
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: 'QUEUE_REPLAYED', count: succeeded.length }));
    }
  } catch { /* silently fail */ }
}

// Queueable mutation endpoints (safe to retry)
const QUEUEABLE_PATHS = [
  '/api/payments',
  '/api/debts',
  '/api/customers',
  '/api/expenses',
  '/api/invoices',
];

function isQueueable(url, method) {
  if (method !== 'POST' && method !== 'PATCH' && method !== 'PUT') return false;
  const { pathname } = new URL(url);
  return QUEUEABLE_PATHS.some((p) => pathname.startsWith(p));
}

// ───────────────────────── fetch router ─────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Handle mutation requests that can be queued offline
  if (request.method !== 'GET' && isSameOrigin(request.url) && isQueueable(request.url, request.method)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request.clone());
          return res;
        } catch {
          // Offline — queue the request for replay
          const body = await request.clone().text();
          const headers = {};
          request.headers.forEach((v, k) => { if (k !== 'cookie') headers[k] = v; });
          await enqueueRequest(request.url, request.method, headers, body);
          return new Response(
            JSON.stringify({ success: true, queued: true, message: 'Saved offline. Will sync when you reconnect.' }),
            { status: 202, headers: { 'Content-Type': 'application/json' } },
          );
        }
      })(),
    );
    return;
  }

  // Ignore other non-GET requests (non-queueable mutations must hit network).
  if (request.method !== 'GET') return;

  // Ignore cross-origin requests (e.g. Google Fonts CSS we let the browser handle).
  if (!isSameOrigin(request.url)) return;

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

// Handle messages from the app.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'REPLAY_QUEUE') replayQueue();
});

// Replay queued requests when coming back online.
self.addEventListener('online', () => replayQueue());

// Also replay on sync event if supported.
self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-queue') {
    event.waitUntil(replayQueue());
  }
});
