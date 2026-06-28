import { AI_ENABLED } from "@/config/ai";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAiAuditNarrative } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export function AiAuditNarrativePanel({ entityType, entityId, enabled = AI_ENABLED }: { entityType: string; entityId: string; enabled?: boolean }) {
  const { data, isLoading } = useAiAuditNarrative(entityType, entityId);
  if (!enabled) return null;
  return (
    <Collapsible>
      <section className="pdm-card mt-4 p-5">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
          <span className="font-semibold">Audit Summary</span>
          <AiBadge prototype />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 text-sm text-muted-foreground">
          {isLoading ? "Summarising audit trail..." : data?.narrative}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
