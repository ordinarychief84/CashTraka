import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type Props = {
  children: React.ReactNode;
  /** Disable horizontal padding (full-bleed lists, etc.). */
  flush?: boolean;
  /** Hide the SafeAreaView (use when the screen handles its own insets). */
  noSafeArea?: boolean;
  /** Pull-to-refresh handler. When set, the screen wraps in a ScrollView. */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /** Disable the ScrollView wrapper (the screen has its own FlatList, etc.). */
  scroll?: boolean;
};

/**
 * Page-level scaffold. Handles safe areas, default padding, and an
 * optional pull-to-refresh. Use as the root element of every route.
 */
export function Screen({
  children,
  flush,
  noSafeArea,
  onRefresh,
  refreshing,
  scroll = true,
}: Props) {
  const padding = flush ? null : styles.padded;
  const SafeWrap = noSafeArea ? View : SafeAreaView;

  if (!scroll) {
    return (
      <SafeWrap style={[styles.root, padding]} edges={['top']}>
        {children}
      </SafeWrap>
    );
  }
  return (
    <SafeWrap style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, padding]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand[500]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeWrap>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  scroll: { flexGrow: 1, paddingVertical: spacing.lg, gap: spacing.lg },
  padded: { paddingHorizontal: spacing.lg },
});
