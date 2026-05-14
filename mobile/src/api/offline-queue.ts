/**
 * Offline write queue for the mobile client.
 *
 * Nigerian internet is spotty — especially mid-production on a factory
 * floor or in a shop. This queue lets the user keep using the app
 * (creating orders, marking production complete, receiving POs) while
 * offline; we enqueue mutating requests and flush them on reconnect.
 *
 * Design choices:
 *   1. Queue persisted in MMKV so it survives app force-kill.
 *   2. Only mutating verbs are queued (POST/PATCH/PUT/DELETE). GETs
 *      always go straight to the network — read failures surface
 *      stale React Query cache, which is the right UX for "I'm
 *      offline, show me what we have."
 *   3. Idempotency keys generated client-side and sent in the
 *      `Idempotency-Key` header so a retry after partial network
 *      failure doesn't double-spawn an order on the server. The web
 *      API ignores this header today (no-op); a follow-up patch on
 *      the server makes it cache responses by key for 24 h.
 *   4. Failures classify into "retry" (network/5xx) vs "drop"
 *      (4xx other than 401). Drops emit a Sentry breadcrumb so we
 *      learn what users tried.
 *   5. Replay is single-flight + sequential. We never fire two
 *      writes in parallel from the queue — a CustomerOrder creation
 *      followed by a state-change has to land in order.
 *
 * Reads are NOT queued. The TanStack Query persistor hydrates from
 * MMKV on app start (set up in src/api/query-client.ts).
 */

import { appStorage } from '@/lib/storage';
import { reportError } from '@/lib/sentry';
import { readSession } from '@/lib/storage';
import { AppError, appErrorFromResponse } from '@/lib/errors';
import Constants from 'expo-constants';

const QUEUE_KEY = 'ct.offlineQueue.v1';

export type QueuedRequest = {
  /** Stable client-generated id; also serves as Idempotency-Key. */
  id: string;
  path: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Pre-stringified JSON body — null for no body. */
  body: string | null;
  /** Best-effort label shown in the offline indicator. */
  label?: string;
  /** Unix ms — used to age out stale items. */
  enqueuedAt: number;
  /** How many flush attempts have failed since enqueue. */
  attempts: number;
};

function read(): QueuedRequest[] {
  try {
    const raw = appStorage.getString(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: QueuedRequest[]) {
  try {
    appStorage.set(QUEUE_KEY, JSON.stringify(items));
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      tags: { area: 'offline-queue', stage: 'persist' },
    });
  }
}

function clientId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

export const offlineQueue = {
  /** Read-only snapshot. Mostly for the offline indicator badge. */
  list(): QueuedRequest[] {
    return read();
  },

  size(): number {
    return read().length;
  },

  enqueue(args: {
    path: string;
    method: QueuedRequest['method'];
    body?: unknown;
    label?: string;
  }): QueuedRequest {
    const item: QueuedRequest = {
      id: clientId(),
      path: args.path,
      method: args.method,
      body: args.body == null ? null : JSON.stringify(args.body),
      label: args.label,
      enqueuedAt: Date.now(),
      attempts: 0,
    };
    write([...read(), item]);
    return item;
  },

  remove(id: string) {
    write(read().filter((q) => q.id !== id));
  },

  clear() {
    write([]);
  },
};

function baseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  return fromExtra ?? 'https://www.cashtraka.co';
}

let flushing = false;

/**
 * Walk the queue, one item at a time, in FIFO order. Stops at the first
 * retryable failure (network / 5xx / 429) — the next reconnect attempt
 * will pick up where this one left off. Drops items on permanent 4xx
 * with a Sentry breadcrumb.
 *
 * Concurrency-safe: a single in-process flag prevents two flush passes
 * from racing. Safe to call from a reconnect listener, a screen mount,
 * or a manual "Retry now" button.
 */
export async function flushOfflineQueue(): Promise<{
  flushed: number;
  remaining: number;
  paused: boolean;
}> {
  if (flushing) {
    return { flushed: 0, remaining: read().length, paused: true };
  }
  flushing = true;
  let flushed = 0;
  try {
    while (read().length > 0) {
      const items = read();
      const next = items[0];
      const token = await readSession();
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-client': 'mobile',
        'Idempotency-Key': next.id,
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      let res: Response;
      try {
        res = await fetch(baseUrl() + next.path, {
          method: next.method,
          headers,
          body: next.body ?? undefined,
        });
      } catch {
        // Network / connection failure — keep the item, give up for now.
        write(items.map((q, i) => (i === 0 ? { ...q, attempts: q.attempts + 1 } : q)));
        return { flushed, remaining: read().length, paused: true };
      }

      if (res.status >= 500 || res.status === 429) {
        write(items.map((q, i) => (i === 0 ? { ...q, attempts: q.attempts + 1 } : q)));
        return { flushed, remaining: read().length, paused: true };
      }

      if (res.status === 401) {
        // Token expired or revoked. Pause the queue — the auth store
        // will clear the session and route to /login; the queue stays
        // intact so we don't lose the user's work mid-shift.
        return { flushed, remaining: read().length, paused: true };
      }

      if (!res.ok) {
        // Permanent 4xx (validation, conflict, not found). Drop the
        // item with a breadcrumb so we learn what the user tried that
        // the server refused.
        const body = await res.text().catch(() => '');
        const err = appErrorFromResponse(res.status, body);
        reportError(err, {
          tags: { area: 'offline-queue', status: String(res.status), path: next.path },
          extras: { body: next.body, label: next.label },
        });
        offlineQueue.remove(next.id);
        flushed++;
        continue;
      }

      // 2xx — success, drop from queue, count it, move on.
      offlineQueue.remove(next.id);
      flushed++;
    }
    return { flushed, remaining: 0, paused: false };
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      tags: { area: 'offline-queue', stage: 'flush' },
    });
    return { flushed, remaining: read().length, paused: true };
  } finally {
    flushing = false;
  }
}

/**
 * Helper for callers that want "fire and forget if offline, run inline
 * if online." Returns null when queued; returns the parsed response
 * when it ran online. The caller's UI shows optimistic state in either
 * case — TanStack Query mutations handle this for us in practice.
 */
export async function fireOrQueue<T>(args: {
  path: string;
  method: QueuedRequest['method'];
  body?: unknown;
  label?: string;
}): Promise<T | null> {
  const token = await readSession();
  if (!token) {
    // No session → can't possibly succeed, don't even queue.
    throw new AppError('UNAUTHORIZED', 'Sign in first');
  }
  try {
    const res = await fetch(baseUrl() + args.path, {
      method: args.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-client': 'mobile',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': /* fresh id for online path */ Math.random().toString(36).slice(2),
      },
      body: args.body == null ? undefined : JSON.stringify(args.body),
    });
    if (res.ok) {
      const text = await res.text();
      if (!text) return null;
      try {
        const parsed = JSON.parse(text);
        return (parsed?.success && 'data' in parsed ? parsed.data : parsed) as T;
      } catch {
        return null;
      }
    }
    if (res.status >= 500 || res.status === 429) {
      offlineQueue.enqueue(args);
      return null;
    }
    if (res.status === 401) {
      throw new AppError('UNAUTHORIZED', 'Session expired');
    }
    const body = await res.text().catch(() => '');
    throw appErrorFromResponse(res.status, body);
  } catch (e) {
    if (e instanceof AppError) throw e;
    // Network error — queue + return null so the UI can show optimistic state.
    offlineQueue.enqueue(args);
    return null;
  }
}
