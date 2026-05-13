import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme';
import { useUnreadCount } from '@/api/queries/useNotifications';
import { View, StyleSheet } from 'react-native';

/**
 * Bottom tabs for the authenticated app. Five tabs matches what
 * users do every day: see what's pending, capture orders, run
 * production, manage materials, settings. Anything else lives one
 * level deeper.
 */
export default function TabsLayout() {
  const { data: unread } = useUnreadCount();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarLabel: 'Today',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="production"
        options={{
          title: 'Production',
          tabBarLabel: 'Production',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏭" color={color} />,
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: 'Materials',
          tabBarLabel: 'Materials',
          tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarLabel: 'More',
          tabBarIcon: ({ color }) => <TabIcon emoji="⋯" color={color} />,
          tabBarBadge: unread && unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View style={styles.icon}>
      <Text style={{ fontSize: 20, opacity: color === colors.brand[500] ? 1 : 0.6 }}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
});
