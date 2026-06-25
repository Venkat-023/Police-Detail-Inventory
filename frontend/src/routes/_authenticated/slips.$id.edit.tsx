import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { SlipForm } from "@/components/slips/SlipForm";

export const Route = createFileRoute("/_authenticated/slips/$id/edit")({
  ssr: false,
  component: EditSlipPage,
});

function EditSlipPage() {
  const { user } = useAuth();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: slip, isLoading } = useQuery({
    queryKey: ["slip", id],
    queryFn: () => mockApi.getSlip(user!, id),
    enabled: !!user,
  });
  useEffect(() => {
    if (slip && slip.status !== "Draft") navigate({ to: "/slips/$id", params: { id } });
  }, [slip, id, navigate]);

  return (
    <AppLayout title="Edit Slip">
      {isLoading || !slip || !user ? <SkeletonRows /> : <SlipForm user={user} initial={slip} mode="edit" />}
    </AppLayout>
  );
}
