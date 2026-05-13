import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/api/queries/useNotifications';
import { colors, spacing, typography, radius } from '@/theme';

/**
 * The "More" tab is the catchall: profile, notifications, suppliers,
 * inventory ledger, settings, sign-out. Keeps the primary tab bar
 * focused on the daily ops loop.
 */
export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: unread } = useUnreadCount();

  return (
    <Screen>
      <Card>
        <Text style={typography.h3}>{user?.businessName || user?.name}</Text>
        <Text style={{ ...typography.small, color: colors.textMuted, marginTop: spacing.xs }}>
          {user?.email}
        </Text>
      </Card>

      <View style={styles.section}>
        <Row
          label="Notifications"
          badge={unread && unread > 0 ? (unread > 99 ? '99+' : String(unread)) : undefined}
          onPress={() => router.push('/notifications')}
        />
        <Row label="Suppliers" onPress={() => router.push('/suppliers')} />
        <Row label="Purchase orders" onPress={() => router.push('/purchase-orders')} />
        <Row label="Inventory ledger" onPress={() => router.push('/inventory')} />
        <Row label="Recipes" onPress={() => router.push('/recipes')} />
        <Row label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <Button label="Sign out" variant="secondary" onPress={() => logout()} />
    </Screen>
  );
}

function Row({ label, badge, onPress }: { label: string; badge?: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} elevated={false} style={styles.row}>
      <Text style={typography.body}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <Text style={{ color: colors.textMuted }}>›</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: colors.danger[500],
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
