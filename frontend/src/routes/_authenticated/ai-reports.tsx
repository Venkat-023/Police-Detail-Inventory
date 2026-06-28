import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiReportPanel } from "@/components/ai/AiReportPanel";

export const Route = createFileRoute("/_authenticated/ai-reports")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("pdm_auth_v1");
    const parsed = raw ? JSON.parse(raw) : null;
    const email = parsed?.state?.user?.email;
    if (!["admin@avis.com", "finance@nationalgrid.com"].includes(email)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AiReportsPage,
});

function AiReportsPage() {
  return (
    <AppLayout title="AI Reports">
      <AiReportPanel />
    </AppLayout>
  );
}
