/**
 * The single fetch wrapper used by every API call in the app.
 *
 * Responsibilities:
 *   - Inject the auth bearer token from secure storage.
 *   - Convert non-2xx responses into typed AppError so callers can
 *     `if (err.code === 'UNAUTHORIZED') logout()` instead of
 *     parsing status codes everywhere.
 *   - On 401, clear the session and emit an auth event so the auth
 *     store can redirect to /login.
 *   - Network failures surface as AppError('NETWORK', ...).
 *   - JSON parse failures are tolerated (some endpoints return text).
 *   - Timeouts: 20s default, override per call via opts.timeoutMs.
 *
 * Use the higher-level `useQuery`/`useMutation` hooks for components;
 * use `apiFetch` directly only for one-off non-React code (e.g.
 * background prefetch from an Expo task).
 */

import Constants from 'expo-constants';
import { AppError, appErrorFromResponse } from '@/lib/errors';
import { readSession, clearSession } from '@/lib/storage';
import { reportError } from '@/lib/sentry';

const DEFAULT_TIMEOUT_MS = 20_000;

function baseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  return fromExtra ?? 'https://www.cashtraka.co';
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth header injection (login, signup, public probes). */
  anonymous?: boolean;
  /** Abort the request after this many ms. Default 20s. */
  timeoutMs?: number;
  /** Provide an existing AbortSignal (e.g. from TanStack Query). */
  signal?: AbortSignal;
};

/** Event listeners get called when the server returns 401. */
type AuthListener = () => void;
const authListeners = new Set<AuthListener>();
export function onUnauthenticated(fn: AuthListener) {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders,
    anonymous,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: callerSignal,
  } = opts;

  const url = path.startsWith('http') ? path : baseUrl() + path;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...extraHeaders,
  };

  if (!anonymous) {
    const token = await readSession();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Compose caller's signal with our timeout signal so either aborts.
  const timeoutCtrl = new AbortController();
  const timeout = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  const signal = callerSignal
    ? anySignal([callerSignal, timeoutCtrl.signal])
    : timeoutCtrl.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === 'AbortError') {
      throw new AppError('NETWORK', 'Request timed out');
    }
    throw new AppError('NETWORK', 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  // Parse body once. Some endpoints return text; tolerate.
  let parsed: unknown = undefined;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (res.status === 401 && !anonymous) {
    await clearSession();
    for (const fn of authListeners) {
      try {
        fn();
      } catch {
        /* listener faults must not block the fetch */
      }
    }
  }

  if (!res.ok) {
    const err = appErrorFromResponse(res.status, parsed);
    // 401 / 422 / 404 are routine; don't pollute Sentry with them.
    if (res.status >= 500) {
      reportError(err, {
        tags: { area: 'api', path, status: String(res.status) },
        extras: { body: parsed },
      });
    }
    throw err;
  }

  // Web app envelope: { success: true, data: T }. Unwrap when present.
  if (parsed && typeof parsed === 'object' && 'success' in parsed) {
    const env = parsed as { success: boolean; data: T; error?: string };
    if (env.success) return env.data;
    throw new AppError('UNKNOWN', env.error ?? 'Unknown error');
  }
  return parsed as T;
}

/**
 * Combine multiple AbortSignals — abort if any one fires. Polyfill
 * for AbortSignal.any which RN/Hermes doesn't yet ship.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      ctrl.abort();
      break;
    }
    s.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}
