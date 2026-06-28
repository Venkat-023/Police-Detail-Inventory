import { Bot } from "lucide-react";
import { AI_ENABLED } from "@/config/ai";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAiReconcileSuggestion } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export function AiReconcilePanel({ invoiceId, enabled = AI_ENABLED }: { invoiceId: string; enabled?: boolean }) {
  const { data, isLoading } = useAiReconcileSuggestion(invoiceId);
  if (!enabled) return null;
  return (
    <Collapsible>
      <section className="pdm-card mb-4 p-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
          <span className="inline-flex items-center gap-2 font-semibold"><Bot size={16} /> Reconciliation suggestion</span>
          <AiBadge prototype />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 text-sm">
          {isLoading && <div className="text-muted-foreground">Loading prototype suggestion...</div>}
          {data && (
            <div className="space-y-2">
              <div>Projected status: <span className="font-semibold">{data.projectedStatus}</span></div>
              <div>Matched hours: <span className="font-semibold">{data.totalMatchedHours}</span></div>
              <p className="text-muted-foreground">{data.message}</p>
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
