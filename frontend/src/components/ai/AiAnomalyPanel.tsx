import { AlertTriangle } from "lucide-react";
import { AI_ENABLED } from "@/config/ai";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAiAnomalies } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export function AiAnomalyPanel({ invoiceId, enabled = AI_ENABLED }: { invoiceId: string; enabled?: boolean }) {
  const { data, isLoading } = useAiAnomalies(invoiceId);
  if (!enabled) return null;
  return (
    <Collapsible defaultOpen>
      <section className="pdm-card mb-4 p-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
          <span className="inline-flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Invoice anomaly check</span>
          <AiBadge />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          {isLoading && <div className="text-sm text-muted-foreground">Checking invoice patterns...</div>}
          {!isLoading && data && !data.hasAnomalies && (
            <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">No anomalies detected</span>
          )}
          <div className="space-y-2">
            {data?.flags.map((flag, index) => (
              <div key={`${flag.type}-${index}`} className="rounded-md border border-border bg-surface p-3 text-sm">
                <span className="mr-2 rounded bg-warning/20 px-2 py-0.5 text-xs font-semibold uppercase">{flag.severity}</span>
                {flag.message}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
