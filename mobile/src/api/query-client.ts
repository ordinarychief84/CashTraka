/**
 * TanStack Query client + sensible mobile defaults.
 *
 * Decisions:
 *   - Stale time 30s by default. Most CashTraka data is "what's happening
 *     now in my workshop" — re-fetching on every focus is overkill, but
 *     30s means a backgrounded → foregrounded app sees fresh numbers.
 *   - Retry 2 times on network/5xx, NEVER on 4xx (validation / auth /
 *     not-found are stable; retrying just delays the error UI).
 *   - Refetch on app focus (matches the web `window` focus refetch).
 *   - Mutations don't retry by default (avoid duplicate POSTs).
 */

import { QueryClient } from '@tanstack/react-query';
import { AppError } from '@/lib/errors';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof AppError) {
            // Don't retry on terminal client-side codes.
            if (
              error.code === 'UNAUTHORIZED' ||
              error.code === 'FORBIDDEN' ||
              error.code === 'NOT_FOUND' ||
              error.code === 'VALIDATION' ||
              error.code === 'CONFLICT'
            ) {
              return false;
            }
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
