import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { endpoints } from '../endpoints';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications(opts?: { unreadOnly?: boolean }) {
  return useQuery({
    queryKey: ['notifications', { unread: !!opts?.unreadOnly }],
    queryFn: () =>
      apiFetch<{ rows: Notification[]; total: number; unread: number }>(
        endpoints.notifications() + (opts?.unreadOnly ? '?unreadOnly=1' : ''),
      ),
  });
}

/**
 * Lightweight unread badge poll. 60s refetch — matches the web bell.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      apiFetch<{ count: number }>(endpoints.unreadCount()).then((d) => d.count),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(endpoints.notificationRead(id), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(endpoints.notificationsReadAll(), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
