import type { SlipStatus, InvoiceStatus } from "@/types";

export const STATUS_CONFIG: Record<
  SlipStatus | InvoiceStatus,
  { color: string; bg: string; icon: string; label: string }
> = {
  Draft: { color: "#9E9E9E", bg: "#F5F5F5", icon: "Clock", label: "Draft" },
  Billable: { color: "#1976D2", bg: "#E3F2FD", icon: "ArrowUp", label: "Billable" },
  Confirmed: { color: "#1B5E20", bg: "#E8F5E9", icon: "CheckCircle", label: "Confirmed" },
  NonBillable: { color: "#B71C1C", bg: "#FFEBEE", icon: "XCircle", label: "Non-Billable" },
  NotReconciled: { color: "#E65100", bg: "#FFF3E0", icon: "AlertCircle", label: "Not Reconciled" },
  PartiallyReconciled: { color: "#F57F17", bg: "#FFFDE7", icon: "MinusCircle", label: "Partially Reconciled" },
  Reconciled: { color: "#1B5E20", bg: "#E8F5E9", icon: "CheckCircle", label: "Reconciled" },
  Paid: { color: "#1A237E", bg: "#E8EAF6", icon: "DollarSign", label: "Paid" },
};
