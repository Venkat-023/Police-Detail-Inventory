// Compact slip form used by /slips/new and /slips/$id/edit
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { mockApi } from "@/services/mockApi";
import { SignaturePad } from "./SignaturePad";
import type { PoliceSlip, User } from "@/types";
import { calculateHoursWorked, isOvernight } from "@/utils/hoursCalc";
import { Modal } from "@/components/ui/Overlays";
import { useAutoSave } from "@/hooks/useAutoSave";
import { format } from "date-fns";

const phoneValidator = z.string().regex(
  /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  "Invalid phone number",
);
const hhmm = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be HH:MM");

const schema = z.object({
  region: z.string().min(1, "Required").max(100),
  arboristDistrict: z.string().min(1, "Required"),
  arboristId: z.string().min(1, "Required"),
  workType: z.enum(["HTMP", "Trimming"]),
  budgetCode: z.string().min(1, "Required").max(50),
  circuitId: z.string().min(1, "Required").max(50),
  crewForeman: z.string().min(1, "Required").max(100),
  crewForemanPhone: phoneValidator,
  detailDate: z.string().refine((d) => new Date(d) <= new Date(new Date().toDateString() + " 23:59:59"), "Cannot be in the future"),
  detailType: z.literal("Hourly"),
  timeFrom: hhmm,
  timeTo: hhmm,
  hoursWorked: z.coerce.number().min(0.25, "Min 0.25").max(24, "Max 24"),
  officerName: z.string().min(1).max(100),
  officerEmail: z.string().email("Invalid email"),
  officerPhone: phoneValidator,
  officerRank: z.enum(["Officer", "Sergeant", "Lieutenant", "Captain", "Detective"]),
  cruiserNumber: z.string().min(1).max(20),
  billingDepartment: z.string().min(1).max(100),
  hoursToBeBilled: z.coerce.number().min(0).max(24),
});

type Vals = z.infer<typeof schema>;

const DISTRICTS = ["North District", "South District", "Central District"];
const REGIONS_SUGGEST = ["Boston Metro", "North Shore", "Central MA", "Cape Cod", "Springfield"];

interface Props {
  user: User;
  initial?: PoliceSlip;
  mode: "create" | "edit";
}

export function SlipForm({ user, initial, mode }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState<null | { existingId: string }>(null);
  const [nonBillableOpen, setNonBillableOpen] = useState(false);
  const [nonBillableReason, setNonBillableReason] = useState("");
  const [signature, setSignature] = useState<string | undefined>(initial?.officerSignatureUrl);
  const [sigHighlight, setSigHighlight] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hoursOverridden, setHoursOverridden] = useState(false);

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isDirty } } = useForm<Vals>({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      region: initial.region, arboristDistrict: initial.arboristDistrict, arboristId: initial.arboristId,
      workType: initial.workType, budgetCode: initial.budgetCode, circuitId: initial.circuitId,
      crewForeman: initial.crewForeman, crewForemanPhone: initial.crewForemanPhone,
      detailDate: initial.detailDate, detailType: "Hourly",
      timeFrom: initial.timeFrom, timeTo: initial.timeTo,
      hoursWorked: initial.hoursWorked, hoursToBeBilled: initial.hoursToBeBilled,
      officerName: initial.officerName, officerEmail: initial.officerEmail, officerPhone: initial.officerPhone,
      officerRank: initial.officerRank, cruiserNumber: initial.cruiserNumber, billingDepartment: initial.billingDepartment,
    } : {
      region: "", arboristDistrict: "", arboristId: "",
      workType: "HTMP", budgetCode: "", circuitId: "",
      crewForeman: "", crewForemanPhone: "",
      detailDate: format(new Date(), "yyyy-MM-dd"), detailType: "Hourly" as const,
      timeFrom: "08:00", timeTo: "16:00",
      hoursWorked: 8, hoursToBeBilled: 8,
      officerName: "", officerEmail: "", officerPhone: "",
      officerRank: "Officer", cruiserNumber: "", billingDepartment: "",
    },
  });

  const timeFrom = watch("timeFrom");
  const timeTo = watch("timeTo");
  const { data: arborists = [] } = useQuery({
    queryKey: ["arborists"],
    queryFn: () => mockApi.listArborists(),
  });
  const filteredArborists = useMemo(() => arborists, [arborists]);

  // Auto-calc hours when from/to change (unless user overrode)
  useEffect(() => {
    if (!hoursOverridden && timeFrom && timeTo) {
      const hw = calculateHoursWorked(timeFrom, timeTo);
      setValue("hoursWorked", hw);
      setValue("hoursToBeBilled", hw);
    }
  }, [timeFrom, timeTo, hoursOverridden, setValue]);

  const overnight = isOvernight(timeFrom, timeTo);

  // Auto-save (edit mode, dirty)
  useAutoSave(mode === "edit" && isDirty && !!initial, 60_000, async () => {
    if (!initial) return;
    try {
      await mockApi.updateSlip(user, initial.id, watch() as any);
      setSavedAt(new Date());
    } catch {}
  });

  const doSubmit = async (values: Vals, submitAsBillable: boolean, bypass = false) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await mockApi.createSlip(user, {
          ...values,
          officerSignatureUrl: signature,
          submitAsBillable,
          bypassDuplicateCheck: bypass,
        } as any);
      } else if (initial) {
        await mockApi.updateSlip(user, initial.id, {
          ...values,
          officerSignatureUrl: signature,
          submitAsBillable,
        } as any);
      }
      toast.success(submitAsBillable ? "Slip submitted as Billable" : "Slip saved");
      navigate({ to: "/slips" });
    } catch (e: any) {
      if (e?.code === "DUPLICATE_SLIP") {
        setDupOpen({ existingId: e.details?.existingSlipId });
        return;
      }
      if (e?.code === "SIGNATURE_REQUIRED") {
        setSigHighlight(true);
        document.getElementById("signature-section")?.scrollIntoView({ behavior: "smooth" });
        toast.error(e.message);
        return;
      }
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handleBillableClick = handleSubmit((values) => {
    if (!signature) {
      setSigHighlight(true);
      document.getElementById("signature-section")?.scrollIntoView({ behavior: "smooth" });
      toast.error("Officer signature required to submit as Billable");
      return;
    }
    setConfirmOpen(true);
    (window as any).__pendingValues = values;
  });

  const handleDraftSave = handleSubmit((values) => doSubmit(values, false));

  const handleNonBillable = async () => {
    if (!initial) return;
    if (!nonBillableReason.trim()) { toast.error("Reason is required"); return; }
    setSubmitting(true);
    try {
      await mockApi.transitionSlip(user, initial.id, "NonBillable", nonBillableReason);
      toast.success("Marked Non-Billable");
      navigate({ to: "/slips" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSubmitting(false);
      setNonBillableOpen(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="pdm-card mb-4 p-5">
      <h3 className="mb-4 text-base font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );

  const Field = ({ label, error, children, full }: { label: string; error?: string; children: React.ReactNode; full?: boolean }) => (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );

  const inputCls = "w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring";

  return (
    <form className="pb-6">
      {savedAt && (
        <div className="mb-3 text-xs text-muted-foreground">Auto-saved at {format(savedAt, "HH:mm")}</div>
      )}

      <Section title="Section 1 — Location & Metadata">
        <Field label="Region" error={errors.region?.message}>
          <input list="regions" className={inputCls} {...register("region")} />
          <datalist id="regions">{REGIONS_SUGGEST.map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
        <Field label="Arborist District" error={errors.arboristDistrict?.message}>
          <select className={inputCls} {...register("arboristDistrict")}>
            <option value="">Select…</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Arborist" error={errors.arboristId?.message}>
          <select className={inputCls} {...register("arboristId")}>
            <option value="">Select…</option>
            {filteredArborists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Work Type" error={errors.workType?.message}>
          <select className={inputCls} {...register("workType")}>
            <option value="HTMP">HTMP</option>
            <option value="Trimming">Trimming</option>
          </select>
        </Field>
        <Field label="Budget Code" error={errors.budgetCode?.message}>
          <input className={inputCls} {...register("budgetCode")} />
        </Field>
        <Field label="Circuit ID" error={errors.circuitId?.message}>
          <input className={inputCls} {...register("circuitId")} />
        </Field>
      </Section>

      <Section title="Section 2 — Vendor Details">
        <Field label="Vendor Company">
          <input className={`${inputCls} cursor-not-allowed bg-muted`} value={user.organisationName} disabled />
        </Field>
        <Field label="Crew Foreman" error={errors.crewForeman?.message}>
          <input className={inputCls} {...register("crewForeman")} />
        </Field>
        <Field label="Crew Foreman Phone" error={errors.crewForemanPhone?.message}>
          <input className={inputCls} placeholder="555-123-4567" {...register("crewForemanPhone")} />
        </Field>
      </Section>

      <Section title="Section 3 — Time Tracking">
        <Field label="Detail Date" error={errors.detailDate?.message}>
          <input type="date" max={format(new Date(), "yyyy-MM-dd")} className={inputCls} {...register("detailDate")} />
        </Field>
        <Field label="Detail Type">
          <input className={`${inputCls} cursor-not-allowed bg-muted`} value="Hourly" disabled />
        </Field>
        <Field label="From Time" error={errors.timeFrom?.message}>
          <input type="time" className={inputCls} {...register("timeFrom")} />
        </Field>
        <Field label="To Time" error={errors.timeTo?.message}>
          <input type="time" className={inputCls} {...register("timeTo")} />
          {overnight && <p className="mt-1 text-xs text-warning">Overnight shift detected</p>}
        </Field>
        <Field label="Hours Worked" error={errors.hoursWorked?.message}>
          <div className="flex items-center gap-2">
            <input type="number" step="0.25" className={inputCls}
              {...register("hoursWorked", { onChange: () => setHoursOverridden(true) })} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {hoursOverridden ? "Override" : "Auto-calculated"}
            </span>
          </div>
        </Field>
        <Field label="Police Detail Hours to be Billed" error={errors.hoursToBeBilled?.message}>
          <input type="number" step="0.25" className={inputCls} {...register("hoursToBeBilled")} />
        </Field>
      </Section>

      <Section title="Section 4 — Officer Details">
        <Field label="Officer Name" error={errors.officerName?.message}>
          <input className={inputCls} {...register("officerName")} />
        </Field>
        <Field label="Officer Email" error={errors.officerEmail?.message}>
          <input className={inputCls} type="email" {...register("officerEmail")} />
        </Field>
        <Field label="Officer Phone" error={errors.officerPhone?.message}>
          <input className={inputCls} placeholder="555-123-4567" {...register("officerPhone")} />
        </Field>
        <Field label="Officer Rank" error={errors.officerRank?.message}>
          <select className={inputCls} {...register("officerRank")}>
            <option>Officer</option><option>Sergeant</option><option>Lieutenant</option>
            <option>Captain</option><option>Detective</option>
          </select>
        </Field>
        <Field label="Cruiser #" error={errors.cruiserNumber?.message}>
          <input className={inputCls} {...register("cruiserNumber")} />
        </Field>
        <Field label="Billing Department" error={errors.billingDepartment?.message}>
          <input className={inputCls} {...register("billingDepartment")} />
        </Field>
      </Section>

      <section id="signature-section" className="pdm-card mb-4 p-5">
        <h3 className="mb-4 text-base font-semibold text-foreground">Section 5 — Officer Signature</h3>
        <SignaturePad initialUrl={signature} onChange={(u) => { setSignature(u); setSigHighlight(false); }} invalid={sigHighlight} />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <button type="button" onClick={() => {
          if (isDirty && !confirm("Unsaved changes will be lost. Leave?")) return;
          navigate({ to: "/slips" });
        }} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        {mode === "edit" && initial?.status === "Draft" && (
          <button type="button" onClick={() => setNonBillableOpen(true)}
            className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            Mark as Non-Billable
          </button>
        )}
        <button type="button" disabled={submitting} onClick={handleDraftSave}
          className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent disabled:opacity-50">
          {submitting ? "Saving…" : "Save as Draft"}
        </button>
        <button type="button" disabled={submitting} onClick={handleBillableClick}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          Submit as Billable
        </button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit as Billable?"
        footer={
          <>
            <button onClick={() => setConfirmOpen(false)} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
            <button disabled={submitting}
              onClick={() => doSubmit((window as any).__pendingValues, true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
              {submitting ? "Submitting…" : "Yes, Submit"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Once submitted, this slip enters the NG Arborist review queue and cannot be edited.
        </p>
      </Modal>

      <Modal
        open={!!dupOpen}
        onClose={() => setDupOpen(null)}
        title="Possible duplicate slip"
        footer={
          <>
            <button onClick={() => { if (dupOpen) navigate({ to: "/slips/$id", params: { id: dupOpen.existingId } }); }}
              className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent">
              View Existing Slip
            </button>
            <button onClick={() => { if (!dupOpen) return; const v = (window as any).__pendingValues || watch(); doSubmit(v, false, true); }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
              Create Anyway
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          A slip already exists for this officer on the same date and times. Continue creating a new one?
        </p>
      </Modal>

      <Modal
        open={nonBillableOpen}
        onClose={() => setNonBillableOpen(false)}
        title="Mark slip as Non-Billable"
        footer={
          <>
            <button onClick={() => setNonBillableOpen(false)} className="rounded-md px-4 py-2 text-sm">Cancel</button>
            <button disabled={submitting || !nonBillableReason.trim()} onClick={handleNonBillable}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">
              Confirm Non-Billable
            </button>
          </>
        }
      >
        <label className="mb-1 block text-sm font-medium">Reason</label>
        <textarea rows={4} value={nonBillableReason} onChange={(e) => setNonBillableReason(e.target.value)}
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" />
      </Modal>
    </form>
  );
}
