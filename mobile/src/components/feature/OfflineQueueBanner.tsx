import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { offlineQueue, flushOfflineQueue } from '@/api/offline-queue';
import { colors, spacing, typography } from '@/theme';

/**
 * Small status pill shown sitewide when the offline queue is non-empty.
 * Polls the queue every 2 s for size changes and renders nothing when
 * it's empty (most of the time). Tapping triggers an immediate flush
 * attempt so users have a visible "try now" affordance.
 *
 * Lives in the root layout (mobile/app/_layout.tsx) so it appears on
 * every screen without the seller needing to navigate anywhere.
 */
export function OfflineQueueBanner() {
  const [count, setCount] = useState(() => offlineQueue.size());

  useEffect(() => {
    const id = setInterval(() => setCount(offlineQueue.size()), 2000);
    return () => clearInterval(id);
  }, []);

  if (count === 0) return null;

  return (
    <TouchableOpacity
      onPress={async () => {
        await flushOfflineQueue();
        setCount(offlineQueue.size());
      }}
      activeOpacity={0.8}
      style={{
        marginHorizontal: spacing.lg,
        marginVertical: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        backgroundColor: colors.warning?.[50] ?? '#FFF6E5',
        borderWidth: 1,
        borderColor: colors.warning?.[300] ?? '#F2C16B',
      }}
    >
      <Text style={{ ...typography.smallBold, color: '#7A4B00' }}>
        {count} change{count === 1 ? '' : 's'} waiting to sync
      </Text>
      <Text style={{ ...typography.caption, color: '#7A4B00', opacity: 0.7 }}>
        Tap to retry now.
      </Text>
    </TouchableOpacity>
  );
}
