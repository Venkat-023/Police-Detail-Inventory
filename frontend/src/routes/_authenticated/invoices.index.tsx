import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Eye, DollarSign, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { Modal } from "@/components/ui/Overlays";
import { useState } from "react";

const searchSchema = z.object({
  status: z.string().optional(),
  vendor: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/invoices/")({
  ssr: false,
  validateSearch: searchSchema,
  component: InvoiceListPage,
});

const TABS = [
  { key: "all", label: "All" },
  { key: "NotReconciled", label: "Not Reconciled" },
  { key: "PartiallyReconciled", label: "Partially Reconciled" },
  { key: "Reconciled", label: "Reconciled" },
  { key: "Paid", label: "Paid" },
];

function InvoiceListPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const search = useSearch({ from: "/_authenticated/invoices/" });
  const navigate = useNavigate({ from: "/_authenticated/invoices/" });
  const qc = useQueryClient();
  const [payConfirm, setPayConfirm] = useState<{ id: string; num: string } | null>(null);

  const active = (search.status as string) || "all";

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", user?.id, active, search.vendor, search.dateFrom, search.dateTo],
    queryFn: () => mockApi.listInvoices(user!, {
      status: active === "all" ? undefined : (active as any),
      vendorCompany: search.vendor, dateFrom: search.dateFrom, dateTo: search.dateTo,
    }),
    enabled: !!user,
  });

  const payM = useMutation({
    mutationFn: (id: string) => mockApi.markInvoicePaid(user!, id),
    onSuccess: () => { toast.success("Invoice marked Paid"); qc.invalidateQueries({ queryKey: ["invoices"] }); setPayConfirm(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const setSearch = (patch: Record<string, any>) => navigate({ search: (prev: any) => ({ ...prev, ...patch }) });

  if (!user) return null;

  return (
    <AppLayout title="Invoices & Reconciliation">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-md border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setSearch({ status: t.key })}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition ${
                active === t.key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >{t.label}</button>
          ))}
        </div>
        {can("invoices:create") && (
          <Link to="/invoices/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            <Plus size={16} /> Add Invoice
          </Link>
        )}
      </div>

      <details className="pdm-card mb-4 p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Filter size={16} /> Filters</summary>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {user.scope === "Utility" && (
            <input placeholder="Vendor Company" defaultValue={search.vendor ?? ""}
              onBlur={(e) => setSearch({ vendor: e.target.value || undefined })}
              className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
          )}
          <input type="date" defaultValue={search.dateFrom ?? ""} onChange={(e) => setSearch({ dateFrom: e.target.value || undefined })}
            className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
          <input type="date" defaultValue={search.dateTo ?? ""} onChange={(e) => setSearch({ dateTo: e.target.value || undefined })}
            className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
        </div>
      </details>

      <div className="pdm-card overflow-x-auto">
        {isLoading ? <div className="p-4"><SkeletonRows /></div> :
          !data || data.length === 0 ? (
            <EmptyState
              title="No invoices found"
              description={can("invoices:create") ? "Create your first invoice to start reconciling slips." : "No invoices match the current filters."}
              action={can("invoices:create") ? <Link to="/invoices/new" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">+ Add Invoice</Link> : undefined}
            />
          ) : (
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2.5">Invoice ID</th>
                  <th className="px-3 py-2.5">NG #</th>
                  <th className="px-3 py-2.5">Vendor #</th>
                  <th className="px-3 py-2.5">Vendor</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Total Hours</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((inv, i) => (
                  <tr key={inv.id} className={`border-b border-border/40 hover:bg-row-hover ${i % 2 ? "bg-row-alt" : ""}`}>
                    <td className="px-3 py-2 font-mono text-xs">{inv.id}</td>
                    <td className="px-3 py-2">{inv.ngInvoiceNumber}</td>
                    <td className="px-3 py-2">{inv.vendorInvoiceNumber ?? "—"}</td>
                    <td className="px-3 py-2">{inv.vendorCompany}</td>
                    <td className="px-3 py-2">{inv.invoiceDate}</td>
                    <td className="px-3 py-2">{inv.totalHours}</td>
                    <td className="px-3 py-2">${inv.invoiceAmount.toFixed(2)}</td>
                    <td className="px-3 py-2"><StatusBadge status={inv.status} size="sm" /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Link to="/invoices/$id" params={{ id: inv.id }} className="rounded p-1.5 text-foreground hover:bg-muted" aria-label="View">
                          <Eye size={16} />
                        </Link>
                        {["Reconciled", "PartiallyReconciled"].includes(inv.status) && user.roleName === "NG Detail Admin" && (
                          <button onClick={() => setPayConfirm({ id: inv.id, num: inv.ngInvoiceNumber })}
                            className="inline-flex items-center gap-1 rounded-md bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground hover:opacity-90">
                            <DollarSign size={14} /> Mark as Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <Modal
        open={!!payConfirm}
        onClose={() => setPayConfirm(null)}
        title="Mark Invoice as Paid"
        footer={
          <>
            <button onClick={() => setPayConfirm(null)} className="rounded-md px-4 py-2 text-sm">Cancel</button>
            <button disabled={payM.isPending} onClick={() => payConfirm && payM.mutate(payConfirm.id)}
              className="inline-flex items-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground disabled:opacity-50">
              <DollarSign size={14} /> Confirm Paid
            </button>
          </>
        }
      >
        <p className="text-sm">Mark invoice <span className="font-mono">{payConfirm?.num}</span> as paid? This cannot be undone.</p>
      </Modal>
    </AppLayout>
  );
}
