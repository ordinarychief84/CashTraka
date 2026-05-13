import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { useCurrentUser } from '@/hooks/useAuth';
import { colors, spacing, typography } from '@/theme';
import { formatKobo } from '@/lib/format';

/**
 * The "Today" screen — what the user sees first every time they
 * open the app. Five operational signals from a single
 * /api/dashboard endpoint (today this composes from existing
 * endpoints; a future server consolidation reduces it to one call).
 */
export default function DashboardScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const signals = useDashboardSignals();

  return (
    <Screen onRefresh={signals.refetch} refreshing={signals.isRefetching}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {greeting()}, {user?.name.split(' ')[0] ?? 'there'}
        </Text>
        <Text style={styles.sub}>Here's what needs attention.</Text>
      </View>

      <View style={styles.grid}>
        <Signal
          label="Orders pending"
          value={signals.data?.ordersPending ?? 0}
          tone="brand"
          onPress={() => router.push('/(tabs)/orders')}
        />
        <Signal
          label="Production in progress"
          value={signals.data?.productionInProgress ?? 0}
          tone="brand"
          onPress={() => router.push('/(tabs)/production')}
        />
        <Signal
          label="Low materials"
          value={signals.data?.lowMaterials ?? 0}
          tone={signals.data?.lowMaterials ? 'owed' : 'muted'}
          onPress={() => router.push('/(tabs)/materials')}
        />
        <Signal
          label="Shortages"
          value={signals.data?.shortages ?? 0}
          tone={signals.data?.shortages ? 'danger' : 'muted'}
          onPress={() => router.push('/(tabs)/production')}
        />
      </View>

      <Card>
        <Text style={typography.h3}>Quick capture</Text>
        <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Got a customer who just placed an order? Tap below.
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button
            label="New customer order"
            onPress={() => router.push('/orders/new')}
            fullWidth
          />
        </View>
      </Card>

      {signals.data?.recentRevenueKobo != null && (
        <Card>
          <Text style={typography.h3}>This week</Text>
          <Text style={styles.revenue}>{formatKobo(signals.data.recentRevenueKobo)}</Text>
          <Text style={typography.small}>Revenue across paid payments</Text>
        </Card>
      )}
    </Screen>
  );
}

function Signal({
  label,
  value,
  tone,
  onPress,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'owed' | 'danger' | 'muted';
  onPress: () => void;
}) {
  const palette = TONES[tone];
  return (
    <Card onPress={onPress} style={styles.signalCard}>
      <Text style={[typography.caption, { color: palette.label }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.signalValue, { color: palette.value }]}>{value}</Text>
    </Card>
  );
}

const TONES = {
  brand: { value: colors.brand[700], label: colors.textMuted },
  owed: { value: colors.owed[700], label: colors.owed[500] },
  danger: { value: colors.danger[700], label: colors.danger[500] },
  muted: { value: colors.textMuted, label: colors.textMuted },
};

function useDashboardSignals() {
  return useQuery({
    queryKey: ['dashboard', 'signals'],
    queryFn: async () => {
      // Compose from existing endpoints. A future
      // `/api/dashboard` route should aggregate server-side.
      const [orders, prod, shortages, low] = await Promise.all([
        apiFetch<{ rows: unknown[]; total: number }>(
          endpoints.customerOrders() + '?status=NEW,CONFIRMED',
        ),
        apiFetch<{ rows: unknown[]; total: number }>(
          endpoints.productionOrders() + '?status=IN_PRODUCTION',
        ),
        apiFetch<{ rows: unknown[] }>(endpoints.inventoryShortages()),
        apiFetch<{ materials: unknown[] }>(
          endpoints.inventoryLowStock() + '?scope=materials',
        ),
      ]);
      return {
        ordersPending: orders.total,
        productionInProgress: prod.total,
        shortages: shortages.rows?.length ?? 0,
        lowMaterials: low.materials?.length ?? 0,
        recentRevenueKobo: null as number | null,
      };
    },
  });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.md, gap: spacing.xs },
  greeting: { ...typography.h1, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  signalCard: { flexBasis: '47%', flexGrow: 1, gap: spacing.sm },
  signalValue: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38 },
  revenue: {
    ...typography.display,
    color: colors.text,
    marginTop: spacing.sm,
  },
});
