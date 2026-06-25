import { useAuthStore } from "@/store/authStore";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const can = (permission: string) => {
    if (!user) return false;
    // exact match
    if (user.permissions.includes(permission)) return true;
    // wildcard suffix support: "slips:*" matches "slips:read"
    return user.permissions.some((p) => {
      if (p === "*") return true;
      if (p.endsWith(":*")) return permission.startsWith(p.slice(0, -1));
      return false;
    });
  };
  return { can, user };
}
