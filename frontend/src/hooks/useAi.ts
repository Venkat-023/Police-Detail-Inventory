import { useMutation, useQuery } from "@tanstack/react-query";
import { AI_ENABLED } from "@/config/ai";
import { ai } from "@/services/mockApi";
import type { ReportParams } from "@/types/ai";

export function useAiPrefill() {
  return useQuery({
    queryKey: ["ai", "prefill"],
    queryFn: () => ai.getPrefill(),
    enabled: AI_ENABLED,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAiAnomalies(invoiceId: string) {
  return useQuery({
    queryKey: ["ai", "anomalies", invoiceId],
    queryFn: () => ai.getInvoiceAnomalies(invoiceId),
    enabled: AI_ENABLED && !!invoiceId,
    staleTime: 0,
  });
}

export function useAiArboristSuggestion(slipId: string) {
  return useQuery({
    queryKey: ["ai", "arborist", slipId],
    queryFn: () => ai.getArboristSuggestion(slipId),
    enabled: AI_ENABLED && !!slipId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAiReconcileSuggestion(invoiceId: string) {
  return useQuery({
    queryKey: ["ai", "reconcile", invoiceId],
    queryFn: () => ai.getReconcileSuggestion(invoiceId),
    enabled: AI_ENABLED && !!invoiceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAiAuditNarrative(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["ai", "audit", entityType, entityId],
    queryFn: () => ai.getAuditNarrative(entityType, entityId),
    enabled: AI_ENABLED && !!entityType && !!entityId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAiSignature(slipId?: string) {
  return useQuery({
    queryKey: ["ai", "signature", slipId],
    queryFn: () => ai.verifySignature(slipId!),
    enabled: AI_ENABLED && !!slipId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAiDuplicateCheck() {
  return useMutation({ mutationFn: ai.checkDuplicate });
}

export function useAiReport() {
  return useMutation({ mutationFn: (params: ReportParams) => ai.generateReport(params) });
}

export function useAiOcr() {
  return useMutation({ mutationFn: ai.extractOcr });
}
