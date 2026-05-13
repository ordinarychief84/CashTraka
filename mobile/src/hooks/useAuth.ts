import { useAuthStore } from '@/stores/auth.store';

/**
 * Public hook surface for components. Pulls only the fields a
 * caller actually needs to avoid extra re-renders.
 */
export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    status: s.status,
    login: s.login,
    logout: s.logout,
  }));
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}
