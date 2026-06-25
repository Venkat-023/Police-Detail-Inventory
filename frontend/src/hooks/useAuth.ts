import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { token, user, setSession, logout } = useAuthStore();
  return { token, user, isAuthenticated: !!token && !!user, setSession, logout };
}
