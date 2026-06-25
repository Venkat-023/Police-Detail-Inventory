import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Overlays";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Pencil, CheckCircle2, XCircle, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/slips/$id/")({
  ssr: false,
  component: SlipDetailPage,
});

const CHECKLIST = [
  "Location and district verified",
  "Work type matches approved scope",
  "Hours are reasonable for work performed",
  "Officer signature is present",
  "Officer details are complete and accurate",
];

function SlipDetailPage() {
  const { user } = useAuth();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checks, setChecks] = useState<boolean[]>(Array(5).fill(false));
  const [nbOpen, setNbOpen] = useState(false);
  const [nbReason, setNbReason] = useState("");

  const { data: slip, isLoading } = useQuery({
    queryKey: ["slip", id],
    queryFn: () => mockApi.getSlip(user!, id),
    enabled: !!user,
  });
  const { data: audit } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => mockApi.listAuditForEntity(user!, id),
    enabled: !!user,
  });

  const confirmM = useMutation({
    mutationFn: () => mockApi.transitionSlip(user!, id, "Confirmed"),
    onSuccess: () => { toast.success("Slip confirmed"); qc.invalidateQueries({ queryKey: ["slip", id] }); qc.invalidateQueries({ queryKey: ["audit", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const submitM = useMutation({
    mutationFn: () => mockApi.transitionSlip(user!, id, "Billable"),
    onSuccess: () => { toast.success("Submitted"); qc.invalidateQueries({ queryKey: ["slip", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const nbM = useMutation({
    mutationFn: () => mockApi.transitionSlip(user!, id, "NonBillable", nbReason),
    onSuccess: () => { toast.success("Marked Non-Billable"); qc.invalidateQueries({ queryKey: ["slip", id] }); setNbOpen(false); setNbReason(""); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!user) return null;
  if (isLoading || !slip) return <AppLayout title="Slip"><SkeletonRows /></AppLayout>;

  const isOwner = slip.createdById === user.id;
  const isArborist = user.roleName === "NG Arborist";
  const allChecked = checks.every(Boolean);

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );

  return (
    <AppLayout title={`Slip ${slip.slipNumber}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={slip.status} size="lg" />
          <span className="font-mono text-sm text-muted-foreground">{slip.slipNumber}</span>
        </div>
        <Link to="/slips" className="text-sm text-primary hover:underline">← Back to slips</Link>
      </div>

      {slip.status === "Billable" && isOwner && user.roleName === "Vendor GF" && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          This slip is awaiting Arborist review. No edits are possible.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="pdm-card p-5">
          <h3 className="mb-4 text-base font-semibold">Location & Metadata</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Region" value={slip.region} />
            <Field label="District" value={slip.arboristDistrict} />
            <Field label="Arborist" value={slip.arboristName} />
            <Field label="Work Type" value={slip.workType} />
            <Field label="Budget Code" value={slip.budgetCode} />
            <Field label="Circuit ID" value={slip.circuitId} />
          </div>
        </section>
        <section className="pdm-card p-5">
          <h3 className="mb-4 text-base font-semibold">Vendor & Crew</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vendor Company" value={slip.vendorCompany} />
            <Field label="Crew Foreman" value={slip.crewForeman} />
            <Field label="Foreman Phone" value={slip.crewForemanPhone} />
            <Field label="Created By" value={slip.createdByName} />
          </div>
        </section>
        <section className="pdm-card p-5">
          <h3 className="mb-4 text-base font-semibold">Time Tracking</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Detail Date" value={slip.detailDate} />
            <Field label="Type" value={slip.detailType} />
            <Field label="From" value={slip.timeFrom} />
            <Field label="To" value={slip.timeTo} />
            <Field label="Hours Worked" value={slip.hoursWorked.toFixed(2)} />
            <Field label="Hours to Bill" value={slip.hoursToBeBilled.toFixed(2)} />
          </div>
        </section>
        <section className="pdm-card p-5">
          <h3 className="mb-4 text-base font-semibold">Officer</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={slip.officerName} />
            <Field label="Rank" value={slip.officerRank} />
            <Field label="Email" value={slip.officerEmail} />
            <Field label="Phone" value={slip.officerPhone} />
            <Field label="Cruiser #" value={slip.cruiserNumber} />
            <Field label="Billing Dept" value={slip.billingDepartment} />
          </div>
        </section>
        <section className="pdm-card p-5 lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold">Officer Signature</h3>
          {slip.officerSignatureUrl ? (
            <img src={slip.officerSignatureUrl} alt="Officer signature" className="h-32 rounded border border-border bg-surface object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">No signature captured.</p>
          )}
        </section>
      </div>

      {/* Vendor GF action panel for own drafts */}
      {isOwner && user.roleName === "Vendor GF" && slip.status === "Draft" && (
        <section className="pdm-card mt-4 p-5">
          <h3 className="mb-3 text-base font-semibold">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/slips/$id/edit" params={{ id: slip.id }} className="inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent">
              <Pencil size={16} /> Edit Slip
            </Link>
            <button onClick={() => submitM.mutate()} disabled={submitM.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
              <ArrowUp size={16} /> Submit as Billable
            </button>
            <button onClick={() => setNbOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
              <XCircle size={16} /> Mark as Non-Billable
            </button>
          </div>
        </section>
      )}

      {/* Arborist review panel */}
      {isArborist && slip.status === "Billable" && (
        <section className="pdm-card mt-4 p-5">
          <h3 className="mb-3 text-base font-semibold">Arborist Review</h3>
          <ul className="space-y-2">
            {CHECKLIST.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <input type="checkbox" id={`chk-${i}`} checked={checks[i]}
                  onChange={(e) => setChecks((prev) => prev.map((v, j) => j === i ? e.target.checked : v))}
                  className="h-4 w-4 rounded border-input" />
                <label htmlFor={`chk-${i}`} className="text-sm">{item}</label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={!allChecked || confirmM.isPending} onClick={() => confirmM.mutate()}
              className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              <CheckCircle2 size={16} /> Mark as Confirmed
            </button>
            <button onClick={() => setNbOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90">
              <XCircle size={16} /> Mark as Non-Billable
            </button>
          </div>
        </section>
      )}

      {/* Audit trail */}
      <details className="pdm-card mt-4 p-5">
        <summary className="cursor-pointer text-base font-semibold">Audit Trail ({audit?.length ?? 0})</summary>
        <ol className="mt-4 space-y-3 border-l-2 border-border pl-4">
          {(audit ?? []).map((a) => (
            <li key={a.id}>
              <div className="text-xs text-muted-foreground">{format(new Date(a.timestamp), "PPp")}</div>
              <div className="text-sm">
                <span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">({a.actorRole})</span> — {a.action}
                {a.fromState && a.toState && (
                  <span className="ml-1 text-muted-foreground">: {a.fromState} → {a.toState}</span>
                )}
              </div>
            </li>
          ))}
          {(!audit || audit.length === 0) && <p className="text-sm text-muted-foreground">No audit entries.</p>}
        </ol>
      </details>

      <Modal
        open={nbOpen}
        onClose={() => setNbOpen(false)}
        title="Mark slip as Non-Billable"
        footer={
          <>
            <button onClick={() => setNbOpen(false)} className="rounded-md px-4 py-2 text-sm">Cancel</button>
            <button disabled={!nbReason.trim() || nbM.isPending} onClick={() => nbM.mutate()}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">
              Confirm
            </button>
          </>
        }
      >
        <label className="mb-1 block text-sm font-medium">Reason (required)</label>
        <textarea rows={4} value={nbReason} onChange={(e) => setNbReason(e.target.value)}
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" />
      </Modal>
    </AppLayout>
  );
}
