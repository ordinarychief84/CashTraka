/**
 * Auth store. Holds the currently-signed-in user in memory and
 * mirrors the source-of-truth session token in secure storage.
 *
 * Flow:
 *   - App boots → `hydrate()` reads the token from SecureStore and
 *     calls /api/auth/me to populate the user.
 *   - `login()` POSTs credentials, stores the bearer token, populates
 *     the user.
 *   - `logout()` clears storage + memory and the next render redirects
 *     to /login.
 *   - The API client's `onUnauthenticated` listener also calls
 *     `logout()` when the server returns 401 — single funnel.
 */

import { create } from 'zustand';
import { apiFetch, onUnauthenticated } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import {
  readSession,
  writeSession,
  clearSession,
} from '@/lib/storage';
import { analytics } from '@/lib/analytics';
import { setSentryUser, reportError } from '@/lib/sentry';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  businessName?: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  accessRole: string;
};

type AuthState = {
  user: AuthUser | null;
  status: 'loading' | 'unauthenticated' | 'authenticated';
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  async hydrate() {
    const token = await readSession();
    if (!token) {
      set({ user: null, status: 'unauthenticated' });
      return;
    }
    try {
      const me = await apiFetch<AuthUser>(endpoints.me());
      setSentryUser({ id: me.id, email: me.email });
      analytics.identify(me.id);
      set({ user: me, status: 'authenticated' });
    } catch (err) {
      // Stale or revoked token. Wipe and treat as logged out.
      await clearSession();
      set({ user: null, status: 'unauthenticated' });
      if ((err as { code?: string })?.code !== 'UNAUTHORIZED') {
        reportError(err, { tags: { area: 'auth.hydrate' } });
      }
    }
  },

  async login(email, password) {
    const result = await apiFetch<{ token: string; user: AuthUser }>(
      endpoints.login(),
      { method: 'POST', body: { email, password }, anonymous: true },
    );
    await writeSession(result.token);
    setSentryUser({ id: result.user.id, email: result.user.email });
    analytics.identify(result.user.id);
    analytics.track('user_logged_in');
    set({ user: result.user, status: 'authenticated' });
  },

  async logout() {
    analytics.track('user_logged_out');
    try {
      await apiFetch(endpoints.logout(), { method: 'POST' });
    } catch {
      // Server might have already invalidated the session — proceed.
    }
    await clearSession();
    setSentryUser(null);
    analytics.identify(null);
    set({ user: null, status: 'unauthenticated' });
  },

  async refresh() {
    try {
      const me = await apiFetch<AuthUser>(endpoints.me());
      set({ user: me });
    } catch {
      /* hydrate handles unauthenticated; quietly skip */
    }
  },
}));

// Subscribe the API client's 401 listener to the store. The first
// render of the providers tree calls this; idempotent.
let listenerWired = false;
export function wireAuthListener() {
  if (listenerWired) return;
  onUnauthenticated(() => {
    void useAuthStore.getState().logout();
  });
  listenerWired = true;
}
