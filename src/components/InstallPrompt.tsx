'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

/**
 * In-app install banner. Two flavours:
 *   - Chromium/Android: uses the native `beforeinstallprompt` event. A small
 *     bottom banner appears with "Install" and "×". Tapping Install calls
 *     prompt() and hides on accept.
 *   - iOS Safari: the browser never fires beforeinstallprompt, so we render a
 *     static instructions banner explaining the Share → Add to Home Screen
 *     flow, but only if the user is on iOS Safari and not already running
 *     from the home screen.
 *
 * Dismissal persists for 30 days in localStorage so we don't nag.
 */

const DISMISS_KEY = 'cashtraka.installPromptDismissedAt';
const DISMISS_DAYS = 30;

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosVisible, setIosVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Hide if already installed.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS legacy:
      (navigator as any).standalone === true;
    if (standalone) return;

    // Respect prior dismissal for the cool-down window.
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const when = Number(raw);
        if (
          Number.isFinite(when) &&
          Date.now() - when < DISMISS_DAYS * 24 * 60 * 60 * 1000
        ) {
          setDismissed(true);
          return;
        }
      }
    } catch {
      // localStorage may be disabled (private mode). Fall through.
    }

    // Chromium path.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall as any);
    window.addEventListener('appinstalled', onInstalled);

    // iOS path — only when native prompt won't come.
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    if (isIOS && isSafari) setIosVisible(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as any);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDeferred(null);
    setIosVisible(false);
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const res = await deferred.userChoice.catch(() => null);
    if (res?.outcome === 'accepted') setDeferred(null);
  }

  if (dismissed) return null;

  // Chromium/Android banner
  if (deferred) {
    return (
      <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 pb-4 md:bottom-6">
        <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-brand-500/30 bg-white p-3 shadow-xl ring-1 ring-brand-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Smartphone size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink">Install CashTraka</div>
            <div className="text-xs text-slate-600">
              Add it to your home screen for one-tap access.
            </div>
          </div>
          <button
            type="button"
            onClick={install}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-600"
          >
            <Download size={14} />
            Install
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // iOS banner
  if (iosVisible) {
    return (
      <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 pb-4 md:bottom-6">
        <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-brand-500/30 bg-white p-3 shadow-xl ring-1 ring-brand-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Smartphone size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink">Install CashTraka</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Tap <Share size={12} className="inline -translate-y-0.5 text-brand-600" />
              {' '}then <span className="font-semibold">Add to Home Screen</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
