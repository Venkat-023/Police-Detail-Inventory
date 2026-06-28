import { Bot } from "lucide-react";
import { AI_ENABLED } from "@/config/ai";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAiArboristSuggestion } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export function AiArboristPanel({ slipId, enabled = AI_ENABLED }: { slipId: string; enabled?: boolean }) {
  const { data, isLoading } = useAiArboristSuggestion(slipId);
  if (!enabled) return null;
  const badgeClass = data?.recommendation === "reject" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success";
  return (
    <Collapsible defaultOpen>
      <section className="pdm-card mt-4 p-5">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
          <span className="inline-flex items-center gap-2 font-semibold"><Bot size={16} /> Arborist co-pilot</span>
          <AiBadge prototype />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 text-sm">
          {isLoading && <div className="text-muted-foreground">Preparing prototype suggestion...</div>}
          {data && (
            <div className="space-y-3">
              <p>{data.summary}</p>
              <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${badgeClass}`}>
                Suggest: {data.recommendation === "confirm" ? "Confirm" : data.recommendation === "reject" ? "Reject" : "Review"}
              </span>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {data.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
