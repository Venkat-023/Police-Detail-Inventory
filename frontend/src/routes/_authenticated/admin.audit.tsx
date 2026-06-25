import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("pdm_auth_v1");
      const perms: string[] = JSON.parse(raw || "{}")?.state?.user?.permissions ?? [];
      if (!perms.includes("audit:read") && !perms.some((p) => p === "*")) throw redirect({ to: "/dashboard" });
    } catch (e) { if (e && typeof e === "object" && "to" in e) throw e; }
  },
  component: AuditPage,
});

function AuditPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ entityType: "", actor: "", dateFrom: "", dateTo: "" });
  const { data, isLoading } = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => mockApi.listAudit(user!, {
      entityType: filters.entityType || undefined, actor: filters.actor || undefined,
      dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined,
    }),
    enabled: !!user,
  });

  const exportCSV = () => {
    if (!data) return;
    const rows = [["Timestamp", "Entity", "EntityId", "Actor", "Role", "Action", "From", "To", "IP"]];
    data.forEach((a) => rows.push([a.timestamp, a.entityType, a.entityId, a.actorName, a.actorRole, a.action, a.fromState ?? "", a.toState ?? "", a.ipAddress]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (!user) return null;
  const cls = "rounded-md border border-input bg-surface px-3 py-2 text-sm";

  return (
    <AppLayout title="Audit Logs">
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <select className={cls} value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}>
          <option value="">All Entities</option>
          <option>Slip</option><option>Invoice</option><option>User</option><option>Role</option>
        </select>
        <input placeholder="Actor name" className={cls} value={filters.actor} onChange={(e) => setFilters({ ...filters, actor: e.target.value })} />
        <input type="date" className={cls} value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
        <input type="date" className={cls} value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        <button onClick={exportCSV} className="inline-flex items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="pdm-card overflow-x-auto">
        {isLoading || !data ? <div className="p-4"><SkeletonRows /></div> : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">Entity</th>
                <th className="px-3 py-2.5">Entity ID</th>
                <th className="px-3 py-2.5">Actor</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">From → To</th>
                <th className="px-3 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a, i) => (
                <tr key={a.id} className={`border-b border-border/40 ${i % 2 ? "bg-row-alt" : ""}`}>
                  <td className="px-3 py-2 text-xs">{format(new Date(a.timestamp), "PPp")}</td>
                  <td className="px-3 py-2">{a.entityType}</td>
                  <td className="px-3 py-2 font-mono text-xs">{a.entityId}</td>
                  <td className="px-3 py-2">{a.actorName} <span className="text-xs text-muted-foreground">({a.actorRole})</span></td>
                  <td className="px-3 py-2">{a.action}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{a.fromState ?? "—"} → {a.toState ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{a.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
