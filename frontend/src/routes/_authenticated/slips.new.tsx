import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { SlipForm } from "@/components/slips/SlipForm";

export const Route = createFileRoute("/_authenticated/slips/new")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("pdm_auth_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      const perms: string[] = parsed?.state?.user?.permissions ?? [];
      if (!perms.includes("slips:create") && !perms.some((p) => p === "*" || p === "slips:*")) {
        throw redirect({ to: "/slips" });
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: NewSlipPage,
});

function NewSlipPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <AppLayout title="New Police Slip">
      <SlipForm user={user} mode="create" />
    </AppLayout>
  );
}
