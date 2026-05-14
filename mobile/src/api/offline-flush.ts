/**
 * Reconnect-driven flusher for the offline write queue.
 *
 * Mounted once at app startup by the root layout. Watches the device's
 * connectivity state via `@react-native-community/netinfo`; on every
 * transition from offline → online we call `flushOfflineQueue()`. Also
 * polls the queue every 30 s while the app is foregrounded — covers
 * the case where the device thinks it has connectivity but a flaky
 * tower is dropping packets.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushOfflineQueue, offlineQueue } from './offline-queue';

export function useOfflineQueueFlusher() {
  useEffect(() => {
    let mounted = true;

    // Best-effort flush on mount in case the app launched online but
    // the queue carried unflushed items from a prior offline session.
    void flushOfflineQueue();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!mounted) return;
      if (state.isConnected && state.isInternetReachable !== false) {
        void flushOfflineQueue();
      }
    });

    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && mounted) {
        void flushOfflineQueue();
      }
    });

    const interval = setInterval(() => {
      if (mounted && offlineQueue.size() > 0) {
        void flushOfflineQueue();
      }
    }, 30_000);

    return () => {
      mounted = false;
      unsubscribe();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, []);
}
