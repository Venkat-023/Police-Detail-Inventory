import { delay, logAiFeature } from "./log.js";

export interface ReconcileSuggestion {
  _stub: true;
  suggestedSlipIds: string[];
  projectedStatus: "Reconciled" | "PartiallyReconciled";
  totalMatchedHours: number;
  message: string;
}

export async function getReconcileSuggestion(invoiceId: string, userId?: string): Promise<ReconcileSuggestion> {
  const startedAt = Date.now();
  await delay(300);
  const result: ReconcileSuggestion = {
    _stub: true,
    suggestedSlipIds: [],
    projectedStatus: "Reconciled",
    totalMatchedHours: 0,
    message: "Auto-reconciliation stub: real implementation will match confirmed slips by hours and vendor.",
  };
  await logAiFeature("reconcile_suggestion", { invoiceId }, result, startedAt, userId);
  return result;
}
