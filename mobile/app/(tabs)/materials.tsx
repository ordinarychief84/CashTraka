import { View, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme';

/**
 * Materials tab placeholder. Pattern mirrors `orders.tsx` once the
 * `useMaterials` query hook is added (same shape as `useOrders`).
 */
export default function MaterialsScreen() {
  return (
    <Screen>
      <Card>
        <Text style={typography.h3}>Raw materials</Text>
        <Text style={{ ...typography.small, color: colors.textMuted, marginTop: spacing.xs }}>
          Coming next — list, low-stock filter, barcode scan to find a material.
        </Text>
      </Card>
    </Screen>
  );
}
