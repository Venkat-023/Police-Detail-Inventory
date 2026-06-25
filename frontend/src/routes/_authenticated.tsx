import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("pdm_auth_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.state?.token) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
