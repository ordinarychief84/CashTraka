'use client';

import { useEffect } from 'react';

/**
 * Registers the CashTraka service worker (`/sw.js`) on mount. Pragmatic:
 *
 *  - Only runs in production. Next.js dev HMR and service workers don't mix
 *    well (stale caches after every save).
 *  - Calls `registration.update()` on every mount so long-lived installs pick
 *    up new SW versions when the user opens the app.
 *  - Quiet on errors, SW registration is a progressive enhancement.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Best-effort update check — no-op if no new version.
          reg.update().catch(() => null);
        })
        .catch(() => null);
    };

    // Replay queued offline requests when coming back online
    const onOnline = () => {
      navigator.serviceWorker.controller?.postMessage('REPLAY_QUEUE');
    };

    // Listen for queue replay confirmations from SW
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'QUEUE_REPLAYED' && event.data.count > 0) {
        // Optionally show a toast — for now just refresh data
        window.dispatchEvent(new CustomEvent('cashtraka:synced', { detail: event.data.count }));
      }
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    window.addEventListener('online', onOnline);
    navigator.serviceWorker.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('load', onLoad);
      window.removeEventListener('online', onOnline);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
