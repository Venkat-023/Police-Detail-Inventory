import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { mockApi } from "@/services/mockApi";
import toast from "react-hot-toast";
import { useState } from "react";
import { format } from "date-fns";

const schema = z.object({
  ngInvoiceNumber: z.string().min(1, "Required").max(50),
  vendorInvoiceNumber: z.string().max(50).optional(),
  totalHours: z.string().regex(/^\d{1,4}:[0-5][0-9]$/, "Use HH:MM"),
  invoiceAmount: z.coerce.number().min(0.01).max(9999999.99),
  invoiceDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
});
type Vals = z.infer<typeof schema>;

export const Route = createFileRoute("/_authenticated/invoices/new")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("pdm_auth_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      const perms: string[] = parsed?.state?.user?.permissions ?? [];
      if (!perms.includes("invoices:create") && !perms.some((p) => p === "*" || p === "invoices:*")) {
        throw redirect({ to: "/invoices" });
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Vals>({
    resolver: zodResolver(schema),
    defaultValues: { ngInvoiceNumber: "", vendorInvoiceNumber: "", totalHours: "00:00", invoiceAmount: 0, invoiceDate: format(new Date(), "yyyy-MM-dd") },
  });

  if (!user) return null;

  const onSubmit = async (v: Vals) => {
    setSubmitting(true);
    try {
      const inv = await mockApi.createInvoice(user, v);
      toast.success("Invoice created. Add slips to reconcile.");
      navigate({ to: "/invoices/$id", params: { id: inv.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring";

  return (
    <AppLayout title="New Invoice">
      <form onSubmit={handleSubmit(onSubmit)} className="pdm-card max-w-2xl space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Contract Company</label>
          <input className={`${inputCls} cursor-not-allowed bg-muted`} value={user.organisationName} disabled />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">NG Invoice Number *</label>
            <input className={inputCls} {...register("ngInvoiceNumber")} />
            {errors.ngInvoiceNumber && <p className="mt-1 text-xs text-destructive">{errors.ngInvoiceNumber.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Vendor Invoice Number</label>
            <input className={inputCls} {...register("vendorInvoiceNumber")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Total Hours (HH:MM) *</label>
            <input className={inputCls} placeholder="08:00" {...register("totalHours")} />
            {errors.totalHours && <p className="mt-1 text-xs text-destructive">{errors.totalHours.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Invoice Amount (USD) *</label>
            <input type="number" step="0.01" className={inputCls} {...register("invoiceAmount")} />
            {errors.invoiceAmount && <p className="mt-1 text-xs text-destructive">{errors.invoiceAmount.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Invoice Date *</label>
            <input type="date" className={inputCls} {...register("invoiceDate")} />
            {errors.invoiceDate && <p className="mt-1 text-xs text-destructive">{errors.invoiceDate.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => navigate({ to: "/invoices" })} className="rounded-md px-4 py-2 text-sm text-muted-foreground">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {submitting ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
