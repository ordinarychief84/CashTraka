import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ReloadButton } from './ReloadButton';

export const metadata: Metadata = {
  title: 'Offline | CashTraka',
  description: 'No connection right now. CashTraka works best online.',
};

/**
 * Shown when the user is offline AND the page they asked for isn't in the
 * service-worker cache. Intentionally has zero data dependencies so it can
 * render from cache even when the server is unreachable.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-16 text-center">
      <Logo size="lg" />
      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <WifiOff size={32} />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight text-ink">
        You&rsquo;re offline
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Looks like your phone lost signal. Your data is safe. CashTraka will
        reconnect automatically as soon as you&rsquo;re back online.
      </p>
      <ReloadButton />
      <p className="mt-6 text-xs text-slate-500">
        Cached pages (like the landing page) still work offline.
      </p>
    </div>
  );
}
