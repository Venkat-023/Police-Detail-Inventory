import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { usePermissions } from "@/hooks/usePermissions";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Overlays";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { parseHHMMtoMinutes, formatMinutesToHHMM, deriveInvoiceStatus } from "@/utils/reconciliation";
import { DollarSign, X, Plus } from "lucide-react";
import type { PoliceSlip } from "@/types";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/invoices/$id/")({
  ssr: false,
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [attached, setAttached] = useState<PoliceSlip[]>([]);
  const [available, setAvailable] = useState<PoliceSlip[]>([]);
  const [search, setSearch] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => mockApi.getInvoice(user!, id),
    enabled: !!user,
  });
  const { data: avail } = useQuery({
    queryKey: ["availableSlips", id, user?.id],
    queryFn: () => mockApi.listAvailableConfirmedSlips(user!, id),
    enabled: !!user,
  });

  useEffect(() => {
    if (data) setAttached(data.attachedSlips);
  }, [data]);
  useEffect(() => {
    if (avail && data) {
      const attachedIds = new Set(data.attachedSlips.map((s) => s.id));
      setAvailable(avail.filter((s) => !attachedIds.has(s.id)));
    }
  }, [avail, data]);

  const saveM = useMutation({
    mutationFn: () => mockApi.saveReconciliation(user!, id, attached.map((s) => s.id)),
    onSuccess: () => { toast.success("Reconciliation saved"); qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["availableSlips", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const payM = useMutation({
    mutationFn: () => mockApi.markInvoicePaid(user!, id),
    onSuccess: () => { toast.success("Invoice marked Paid"); qc.invalidateQueries({ queryKey: ["invoice", id] }); setPayOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const reconciledMins = useMemo(() => attached.reduce((s, x) => s + Math.round(x.hoursToBeBilled * 60), 0), [attached]);
  const invoiceMins = data ? parseHHMMtoMinutes(data.invoice.totalHours) : 0;
  const diff = invoiceMins - reconciledMins;
  const projectedStatus = data ? deriveInvoiceStatus(data.invoice.totalHours, attached, data.invoice.status) : "NotReconciled";

  if (!user) return null;
  if (isLoading || !data) return <AppLayout title="Invoice"><SkeletonRows /></AppLayout>;

  const inv = data.invoice;
  const isPaid = inv.status === "Paid";
  const canReconcile = can("invoices:reconcile");
  const canPay = can("invoices:pay");

  const onDragEnd = (e: DragEndEvent) => {
    if (isPaid || !canReconcile) return;
    const slipId = String(e.active.id);
    const over = e.over?.id;
    if (over === "attached-zone") {
      const found = available.find((s) => s.id === slipId);
      if (found) {
        setAvailable((a) => a.filter((s) => s.id !== slipId));
        setAttached((a) => [...a, found]);
      }
    } else if (over === "available-zone") {
      const found = attached.find((s) => s.id === slipId);
      if (found) {
        setAttached((a) => a.filter((s) => s.id !== slipId));
        setAvailable((a) => [...a, found]);
      }
    }
  };

  const moveToAttached = (s: PoliceSlip) => { setAvailable((a) => a.filter((x) => x.id !== s.id)); setAttached((a) => [...a, s]); };
  const moveToAvailable = (s: PoliceSlip) => { setAttached((a) => a.filter((x) => x.id !== s.id)); setAvailable((a) => [...a, s]); };

  const filteredAvailable = available.filter((s) =>
    !search || s.officerName.toLowerCase().includes(search.toLowerCase()) || s.slipNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppLayout title={`Invoice ${inv.ngInvoiceNumber}`}>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/invoices" className="text-sm text-primary hover:underline">← Back to invoices</Link>
        <StatusBadge status={inv.status} size="lg" />
      </div>

      {isPaid && (
        <div className="mb-4 rounded-md border border-paid/30 bg-paid/10 p-3 text-sm">
          Invoice marked as Paid on {inv.paidAt ? format(new Date(inv.paidAt), "PPP") : "—"} by {inv.paidByName ?? "—"}.
        </div>
      )}

      {/* Summary */}
      <section className="pdm-card mb-4 grid grid-cols-2 gap-4 p-5 md:grid-cols-5">
        <Stat label="NG Invoice #" value={inv.ngInvoiceNumber} />
        <Stat label="Vendor #" value={inv.vendorInvoiceNumber ?? "—"} />
        <Stat label="Date" value={inv.invoiceDate} />
        <Stat label="Total Hours" value={inv.totalHours} />
        <Stat label="Amount" value={`$${inv.invoiceAmount.toFixed(2)}`} />
      </section>

      {/* Metrics */}
      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="pdm-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Invoice Hours</div>
          <div className="text-2xl font-bold">{inv.totalHours}</div>
        </div>
        <div className="pdm-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Reconciled Hours</div>
          <div className="text-2xl font-bold">{formatMinutesToHHMM(reconciledMins)}</div>
        </div>
        <div className="pdm-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Difference</div>
          <div className={`text-2xl font-bold ${diff === 0 ? "text-success" : "text-destructive"}`}>
            {formatMinutesToHHMM(diff)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Projected status: <span className="font-medium">{projectedStatus}</span></div>
        </div>
      </section>

      {/* Drag interface */}
      <DndContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DropZone id="available-zone" disabled={isPaid || !canReconcile}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Available Confirmed Slips <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{filteredAvailable.length}</span></h3>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by officer or slip #"
              className="mb-3 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" />
            <ul role="list" aria-label="Available slips" className="space-y-2">
              {filteredAvailable.length === 0 && <li className="rounded border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No available slips</li>}
              {filteredAvailable.map((s) => (
                <DraggableCard key={s.id} slip={s} disabled={isPaid || !canReconcile}>
                  <button onClick={() => moveToAttached(s)} disabled={isPaid || !canReconcile}
                    className="inline-flex items-center gap-1 rounded-md border border-primary px-2 py-1 text-xs text-primary hover:bg-accent disabled:opacity-50">
                    <Plus size={12} /> Add
                  </button>
                </DraggableCard>
              ))}
            </ul>
          </DropZone>

          <DropZone id="attached-zone" disabled={isPaid || !canReconcile}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Attached to Invoice <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{attached.length}</span></h3>
              <span className="text-xs text-muted-foreground">{formatMinutesToHHMM(reconciledMins)}</span>
            </div>
            <ul role="list" aria-label="Attached slips" className="space-y-2">
              {attached.length === 0 && <li className="rounded border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Drop slips here</li>}
              {attached.map((s) => (
                <DraggableCard key={s.id} slip={s} disabled={isPaid || !canReconcile}>
                  <button onClick={() => moveToAvailable(s)} disabled={isPaid || !canReconcile}
                    aria-label="Remove" className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                    <X size={14} />
                  </button>
                </DraggableCard>
              ))}
            </ul>
          </DropZone>
        </div>
      </DndContext>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {!isPaid && canReconcile && (
          <button disabled={saveM.isPending} onClick={() => saveM.mutate()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {saveM.isPending ? "Saving…" : "Save Reconciliation"}
          </button>
        )}
        {["Reconciled", "PartiallyReconciled"].includes(inv.status) && canPay && user.roleName === "NG Detail Admin" && (
          <button onClick={() => setPayOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground hover:opacity-90">
            <DollarSign size={14} /> Mark as Paid
          </button>
        )}
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Mark Invoice as Paid"
        footer={
          <>
            <button onClick={() => setPayOpen(false)} className="rounded-md px-4 py-2 text-sm">Cancel</button>
            <button disabled={payM.isPending} onClick={() => payM.mutate()} className="rounded-md bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground disabled:opacity-50">
              Confirm Paid
            </button>
          </>
        }
      >
        <p className="text-sm">Mark invoice <span className="font-mono">{inv.ngInvoiceNumber}</span> as paid? This cannot be undone.</p>
      </Modal>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function DropZone({ id, children, disabled }: { id: string; children: React.ReactNode; disabled?: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled });
  return (
    <section ref={setNodeRef} className={`pdm-card p-4 transition ${isOver ? "ring-2 ring-primary" : ""}`}>
      {children}
    </section>
  );
}

function DraggableCard({ slip, disabled, children }: { slip: PoliceSlip; disabled?: boolean; children?: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: slip.id, disabled });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.6 : 1 } : undefined;
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`flex items-center justify-between gap-2 rounded-md border border-border bg-surface p-3 text-sm ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{slip.slipNumber}</span>
          <span className="font-medium">{slip.officerName}</span>
          <span className="text-xs text-muted-foreground">{slip.hoursToBeBilled.toFixed(2)} hrs</span>
        </div>
        <div className="text-xs text-muted-foreground">{slip.detailDate} · {slip.billingDepartment}</div>
      </div>
      <div onPointerDown={(e) => e.stopPropagation()}>{children}</div>
    </li>
  );
}
