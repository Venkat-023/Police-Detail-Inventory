import { AI_ENABLED } from "@/config/ai";
import { useAiSignature } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export function AiSignaturePanel({ slipId, enabled = AI_ENABLED }: { slipId?: string; enabled?: boolean }) {
  const { data, isLoading } = useAiSignature(slipId);
  if (!enabled || !slipId) return null;
  return (
    <div className="mt-3 rounded-md border border-border bg-surface p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">Signature verification</span>
        <AiBadge prototype />
      </div>
      {isLoading ? (
        <span className="text-muted-foreground">Checking signature...</span>
      ) : (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${data?.isValid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          {data?.isValid ? "Signature accepted" : "Signature unclear"}
        </span>
      )}
    </div>
  );
}
