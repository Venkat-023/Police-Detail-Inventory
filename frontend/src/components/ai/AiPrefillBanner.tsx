import { useState } from "react";
import { Copy } from "lucide-react";
import { AI_ENABLED } from "@/config/ai";
import { useAiPrefill } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export interface AiPrefillBannerProps {
  enabled?: boolean;
  onApply: (field: string, value: string) => void;
}

export function AiPrefillBanner({ enabled = AI_ENABLED, onApply }: AiPrefillBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useAiPrefill();
  const suggestions = data?.suggestions ?? [];
  if (!enabled || dismissed || suggestions.length === 0) return null;
  return (
    <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium"><Copy size={16} /> AI suggestions available</div>
        <AiBadge onDismiss={() => setDismissed(true)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => suggestions.forEach((item) => onApply(item.field, item.value))}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Apply all
        </button>
        {suggestions.map((item) => (
          <button key={item.field} type="button" onClick={() => onApply(item.field, item.value)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs hover:bg-muted">
            {item.field}: {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
