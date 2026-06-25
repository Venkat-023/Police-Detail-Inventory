import type { PoliceSlip, InvoiceStatus } from "@/types";
import { parseHHMMtoMinutes, formatMinutesToHHMM } from "./hoursCalc";

export function calculateReconciledMinutes(slips: PoliceSlip[]): number {
  return slips.reduce((sum, s) => sum + Math.round(s.hoursToBeBilled * 60), 0);
}

export function calculateDifferenceMinutes(invoiceHHMM: string, slips: PoliceSlip[]): number {
  return parseHHMMtoMinutes(invoiceHHMM) - calculateReconciledMinutes(slips);
}

export function deriveInvoiceStatus(
  invoiceHHMM: string,
  slips: PoliceSlip[],
  currentStatus: InvoiceStatus,
): InvoiceStatus {
  if (currentStatus === "Paid") return "Paid";
  if (slips.length === 0) return "NotReconciled";
  const diff = calculateDifferenceMinutes(invoiceHHMM, slips);
  if (diff === 0) return "Reconciled";
  return "PartiallyReconciled";
}

export { parseHHMMtoMinutes, formatMinutesToHHMM };
