'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Notifications bell shown in the app header. Polls the unread count
 * every 60 seconds while the tab is visible (no polling in the
 * background to avoid hammering the API), and opens a dropdown of the
 * 10 most recent notifications when clicked.
 *
 * Wires into the existing crons:
 *   - low-stock-check       (LOW_STOCK)
 *   - expiring-materials    (EXPIRING_MATERIAL)
 *   - overdue-production    (PRODUCTION_DELAYED)
 *   - payment confirmation  (success messages)
 *   - admin actions         (suspend/reactivate/refund/support)
 */

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

const POLL_MS = 60_000;

export function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fast unread-count poll for the badge.
  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        credentials: 'include',
      });
      if (!res.ok) return;
      const body = await res.json();
      if (typeof body?.data?.count === 'number') setCount(body.data.count);
    } catch {
      /* silent; counts are best-effort */
    }
  }, []);

  // Hydrate the dropdown's recent list when opened.
  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?take=10', {
        credentials: 'include',
      });
      const body = await res.json();
      if (body?.success && body.data?.rows) {
        setItems(body.data.rows);
        if (typeof body.data.unread === 'number') setCount(body.data.unread);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling. Pause when the tab is hidden to be a good
  // citizen on the user's bandwidth and our DB.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    refreshCount();
    function start() {
      if (timer) return;
      timer = setInterval(refreshCount, POLL_MS);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      start();
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        refreshCount();
        start();
      } else {
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refreshCount]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) refreshList();
  }

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* tolerate transient failures */
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* tolerate */
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
        aria-expanded={open}
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-ink"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {count > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </header>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={20} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">All caught up</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  We'll let you know when something needs attention.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'group flex items-start gap-3 px-4 py-3',
                      n.isRead ? 'bg-white' : 'bg-brand-50/30',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        n.isRead ? 'bg-transparent' : 'bg-brand-500',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.isRead) markRead(n.id);
                            setOpen(false);
                          }}
                          className="block"
                        >
                          <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                            {n.message}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                            {n.message}
                          </p>
                        </>
                      )}
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        aria-label="Mark read"
                        onClick={() => markRead(n.id)}
                        className="shrink-0 rounded-md p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-border bg-slate-50 px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              See all notifications →
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
