import { Stack } from 'expo-router';
import { colors } from '@/theme';

/**
 * Stack for unauthenticated screens. No back button to "more" or
 * anywhere outside the auth flow — users navigate within login,
 * signup, forgot-password only.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'slide_from_right',
      }}
    />
  );
}
