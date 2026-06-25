import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eye, Pencil, ArrowUp, CheckCircle2, XCircle, Plus, Filter } from "lucide-react";
import toast from "react-hot-toast";
import type { SlipStatus } from "@/types";
import { z } from "zod";

const searchSchema = z.object({
  status: z.string().optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  vendor: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_authenticated/slips/")({
  ssr: false,
  validateSearch: searchSchema,
  component: SlipListPage,
});

function SlipListPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const search = useSearch({ from: "/_authenticated/slips/" });
  const navigate = useNavigate({ from: "/_authenticated/slips/" });
  const qc = useQueryClient();

  if (!user) return <AppLayout title="Police Slip Details"><SkeletonRows /></AppLayout>;

  const isArborist = user.roleName === "NG Arborist";
  const tabs: { key: string; label: string }[] = isArborist
    ? [
        { key: "Billable", label: "Billable" },
        { key: "Confirmed", label: "Confirmed" },
        { key: "NonBillable", label: "Non-Billable" },
      ]
    : [
        { key: "all", label: "All" },
        { key: "Draft", label: "Draft" },
        { key: "Billable", label: "Billable" },
        { key: "Confirmed", label: "Confirmed" },
        { key: "NonBillable", label: "Non-Billable" },
      ];

  const activeStatus = (search.status as string) || (isArborist ? "Billable" : "all");
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const { data, isLoading } = useQuery({
    queryKey: ["slips", user.id, activeStatus, page, pageSize, search.region, search.district, search.vendor, search.dateFrom, search.dateTo],
    queryFn: () => mockApi.listSlips(user, {
      status: activeStatus === "all" ? undefined : (activeStatus as SlipStatus),
      page, pageSize,
      region: search.region, district: search.district,
      vendorCompany: search.vendor,
      dateFrom: search.dateFrom, dateTo: search.dateTo,
    }),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => mockApi.transitionSlip(user, id, "Billable"),
    onSuccess: () => { toast.success("Submitted as Billable"); qc.invalidateQueries({ queryKey: ["slips"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const confirmMutation = useMutation({
    mutationFn: (id: string) => mockApi.transitionSlip(user, id, "Confirmed"),
    onSuccess: () => { toast.success("Confirmed"); qc.invalidateQueries({ queryKey: ["slips"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const [nbId, setNbId] = useState<string | null>(null);
  const [nbReason, setNbReason] = useState("");
  const nbMutation = useMutation({
    mutationFn: () => mockApi.transitionSlip(user, nbId!, "NonBillable", nbReason),
    onSuccess: () => { toast.success("Non-Billable"); qc.invalidateQueries({ queryKey: ["slips"] }); setNbId(null); setNbReason(""); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const setSearch = (patch: Record<string, any>) => navigate({ search: (prev: any) => ({ ...prev, ...patch }) });

  return (
    <AppLayout title="Police Slip Details">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-md border border-border bg-surface p-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setSearch({ status: t.key, page: 1 })}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition ${
                activeStatus === t.key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(user.roleName === "Vendor GF" || user.roleName === "Vendor Super Admin") && (
          <Link to="/slips/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            <Plus size={16} /> New Slip
          </Link>
        )}
      </div>

      <details className="pdm-card mb-4 p-4 group">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
          <Filter size={16} /> Filters
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input placeholder="Region" defaultValue={search.region ?? ""}
            onBlur={(e) => setSearch({ region: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
          <select defaultValue={search.district ?? ""} onChange={(e) => setSearch({ district: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-input bg-surface px-3 py-2 text-sm">
            <option value="">All Districts</option>
            <option>North District</option><option>South District</option><option>Central District</option>
          </select>
          {user.scope === "Utility" && (
            <input placeholder="Vendor Company" defaultValue={search.vendor ?? ""}
              onBlur={(e) => setSearch({ vendor: e.target.value || undefined, page: 1 })}
              className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
          )}
          <div className="flex gap-2">
            <input type="date" defaultValue={search.dateFrom ?? ""}
              onChange={(e) => setSearch({ dateFrom: e.target.value || undefined, page: 1 })}
              className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
            <input type="date" defaultValue={search.dateTo ?? ""}
              onChange={(e) => setSearch({ dateTo: e.target.value || undefined, page: 1 })}
              className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
          </div>
        </div>
      </details>

      <div className="pdm-card overflow-x-auto">
        {isLoading ? <div className="p-4"><SkeletonRows /></div> : !data || data.items.length === 0 ? (
          <EmptyState
            title="No slips found"
            description="Adjust filters or create a new slip to get started."
            action={can("slips:create") ? (
              <Link to="/slips/new" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">+ New Slip</Link>
            ) : undefined}
          />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2.5">Slip #</th>
                <th className="px-3 py-2.5">Officer</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Work Type</th>
                <th className="px-3 py-2.5">Hours Worked</th>
                <th className="px-3 py-2.5">Hours Billed</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Vendor</th>
                <th className="px-3 py-2.5">Arborist</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s, i) => {
                const isMine = s.createdById === user.id;
                return (
                  <tr key={s.id} className={`border-b border-border/40 hover:bg-row-hover ${i % 2 ? "bg-row-alt" : ""}`}>
                    <td className="px-3 py-2 font-mono text-xs">{s.slipNumber}</td>
                    <td className="px-3 py-2">{s.officerName}</td>
                    <td className="px-3 py-2">{s.detailDate}</td>
                    <td className="px-3 py-2">{s.workType}</td>
                    <td className="px-3 py-2">{s.hoursWorked.toFixed(2)}</td>
                    <td className="px-3 py-2">{s.hoursToBeBilled.toFixed(2)}</td>
                    <td className="px-3 py-2"><StatusBadge status={s.status} size="sm" /></td>
                    <td className="px-3 py-2">{s.vendorCompany}</td>
                    <td className="px-3 py-2">{s.arboristName}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {user.roleName === "Vendor GF" && s.status === "Draft" && isMine ? (
                          <>
                            <Link to="/slips/$id/edit" params={{ id: s.id }} className="rounded p-1.5 text-primary hover:bg-accent" aria-label="Edit"><Pencil size={16} /></Link>
                            <button onClick={() => submitMutation.mutate(s.id)} className="rounded p-1.5 text-primary hover:bg-accent" aria-label="Submit"><ArrowUp size={16} /></button>
                          </>
                        ) : user.roleName === "NG Arborist" && s.status === "Billable" ? (
                          <>
                            <Link to="/slips/$id" params={{ id: s.id }} className="rounded p-1.5 text-foreground hover:bg-muted" aria-label="View"><Eye size={16} /></Link>
                            <button onClick={() => confirmMutation.mutate(s.id)} className="rounded p-1.5 text-success hover:bg-success/10" aria-label="Confirm"><CheckCircle2 size={16} /></button>
                            <button onClick={() => setNbId(s.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10" aria-label="Non-Billable"><XCircle size={16} /></button>
                          </>
                        ) : (
                          <Link to="/slips/$id" params={{ id: s.id }} className="rounded p-1.5 text-foreground hover:bg-muted" aria-label="View"><Eye size={16} /></Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
          </div>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={(e) => setSearch({ pageSize: Number(e.target.value), page: 1 })} className="rounded-md border border-input bg-surface px-2 py-1 text-sm">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button disabled={page <= 1} onClick={() => setSearch({ page: page - 1 })} className="rounded-md border border-input px-3 py-1 disabled:opacity-50">Prev</button>
            <span>Page {page}</span>
            <button disabled={page * pageSize >= data.total} onClick={() => setSearch({ page: page + 1 })} className="rounded-md border border-input px-3 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {nbId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl">
            <h3 className="mb-3 text-base font-semibold">Mark Non-Billable</h3>
            <label className="mb-1 block text-sm font-medium">Reason</label>
            <textarea value={nbReason} onChange={(e) => setNbReason(e.target.value)} rows={4}
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => { setNbId(null); setNbReason(""); }} className="rounded-md px-4 py-2 text-sm">Cancel</button>
              <button disabled={!nbReason.trim() || nbMutation.isPending} onClick={() => nbMutation.mutate()}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
