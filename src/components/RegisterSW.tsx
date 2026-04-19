'use client';

import { useEffect } from 'react';

/**
 * Registers the CashTraka service worker (`/sw.js`) on mount. Pragmatic:
 *
 *  - Only runs in production. Next.js dev HMR and service workers don't mix
 *    well (stale caches after every save).
 *  - Calls `registration.update()` on every mount so long-lived installs pick
 *    up new SW versions when the user opens the app.
 *  - Quiet on errors — SW registration is a progressive enhancement.
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

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
