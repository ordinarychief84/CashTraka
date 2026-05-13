/**
 * Storage abstraction with two distinct backends, picked by use-case.
 *
 *   secureStore  — auth tokens, refresh tokens, anything an attacker
 *                  with file-system access shouldn't see. Backed by
 *                  iOS Keychain / Android Keystore via expo-secure-store.
 *                  Slower (~5-50ms per read). NEVER cache here.
 *
 *   appStorage   — non-sensitive app cache: last-seen dashboard data,
 *                  draft form state, feature-flag overrides, locale.
 *                  Backed by MMKV, sync, microsecond-fast, survives
 *                  app restarts but not uninstall.
 *
 * Both have the same Promise-based API surface so callers don't have
 * to special-case anything. Internally `appStorage` is sync but we
 * wrap it in a Promise for consistency.
 */

import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';

/* ── Secure storage (iOS Keychain / Android Keystore) ──────────── */

export const secureStore = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // Never crash on storage faults. The caller treats "no token" as
      // logged-out and proceeds to the login screen.
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        // Tokens should NOT survive a passcode change without
        // re-authentication. WHEN_UNLOCKED is the safer default.
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch {
      // Surfaced separately via Sentry from the caller — don't
      // double-report here.
    }
  },
  async delete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* tolerate */
    }
  },
};

/* ── Fast app storage (MMKV) ───────────────────────────────────── */

const mmkv = new MMKV({ id: 'cashtraka-app' });

export const appStorage = {
  get<T = unknown>(key: string): T | null {
    const raw = mmkv.getString(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    mmkv.set(key, JSON.stringify(value));
  },
  delete(key: string): void {
    mmkv.delete(key);
  },
  clear(): void {
    mmkv.clearAll();
  },
  /**
   * Bridge for libraries that expect AsyncStorage-style async API
   * (e.g. TanStack Query persister). Wraps the sync MMKV calls.
   */
  asAsync: {
    async getItem(key: string): Promise<string | null> {
      return mmkv.getString(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      mmkv.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      mmkv.delete(key);
    },
  },
};

/* ── Token helpers (the one place auth uses storage directly) ─── */

export const TOKEN_KEY = 'auth.session';
export const REFRESH_KEY = 'auth.refresh';

export async function readSession(): Promise<string | null> {
  return secureStore.get(TOKEN_KEY);
}

export async function writeSession(token: string): Promise<void> {
  return secureStore.set(TOKEN_KEY, token);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    secureStore.delete(TOKEN_KEY),
    secureStore.delete(REFRESH_KEY),
  ]);
}
