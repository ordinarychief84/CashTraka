import { View, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme';

/**
 * Production tab placeholder — wire the real list when the
 * production endpoints are ported. Pattern mirrors `orders.tsx`.
 */
export default function ProductionScreen() {
  return (
    <Screen>
      <Card>
        <Text style={typography.h3}>Production runs</Text>
        <Text style={{ ...typography.small, color: colors.textMuted, marginTop: spacing.xs }}>
          Coming next — same pattern as Orders. Tap "+ New production" to
          plan a run, or open an order and tap "Plan production".
        </Text>
      </Card>
    </Screen>
  );
}
