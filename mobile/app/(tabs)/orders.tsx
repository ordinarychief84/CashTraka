import { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useOrders, type CustomerOrder } from '@/api/queries/useOrders';
import { colors, radius, spacing, typography } from '@/theme';
import { formatKobo, timeAgo } from '@/lib/format';

const STATUSES = ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED'] as const;

export default function OrdersScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const query = useOrders(status ? { status } : undefined);

  return (
    <Screen scroll={false}>
      <View style={styles.toolbar}>
        <View style={styles.chips}>
          <Chip label="All" active={!status} onPress={() => setStatus(undefined)} />
          {STATUSES.map((s) => (
            <Chip
              key={s}
              label={s.replace('_', ' ')}
              active={status === s}
              onPress={() => setStatus(s)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={query.data?.rows ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        ListEmptyComponent={
          query.isLoading ? null : (
            <Card style={styles.empty}>
              <Text style={typography.h3}>No orders yet</Text>
              <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.xs }]}>
                Capture a customer order — items, quantity, due date — and CashTraka tracks it through production to invoice.
              </Text>
              <View style={{ marginTop: spacing.lg }}>
                <Button label="New order" onPress={() => router.push('/orders/new')} />
              </View>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <OrderRow order={item} onPress={() => router.push(`/orders/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}

function OrderRow({ order, onPress }: { order: CustomerOrder; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <StatusPill status={order.status} />
          </View>
          <Text style={styles.customer} numberOfLines={1}>
            {order.customerName}
          </Text>
          <Text style={styles.meta}>{timeAgo(order.createdAt)}</Text>
        </View>
        <Text style={styles.total}>{formatKobo(order.totalKobo)}</Text>
      </View>
    </Card>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Button
      label={label}
      size="sm"
      variant={active ? 'primary' : 'secondary'}
      onPress={onPress}
    />
  );
}

function StatusPill({ status }: { status: CustomerOrder['status'] }) {
  const palette = STATUS_PALETTE[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>
        {status.replace('_', ' ')}
      </Text>
    </View>
  );
}

const STATUS_PALETTE: Record<CustomerOrder['status'], { bg: string; fg: string }> = {
  NEW: { bg: '#F1F5F9', fg: '#475569' },
  CONFIRMED: { bg: '#DBEAFE', fg: '#1E40AF' },
  IN_PRODUCTION: { bg: '#FEF3C7', fg: '#92400E' },
  READY: { bg: colors.success[50], fg: colors.success[700] },
  DELIVERED: { bg: '#E5E7EB', fg: '#475569' },
  CANCELLED: { bg: colors.danger[50], fg: colors.danger[700] },
};

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderNumber: { ...typography.bodyBold, color: colors.text, fontFamily: 'Menlo' },
  customer: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  meta: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  total: { ...typography.bodyBold, color: colors.text },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  pillText: { ...typography.caption, textTransform: 'none' },
  empty: { marginTop: spacing['2xl'] },
});
