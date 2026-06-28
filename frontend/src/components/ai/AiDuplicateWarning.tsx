import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AI_ENABLED } from "@/config/ai";
import { ai } from "@/services/mockApi";
import type { DuplicateResult } from "@/types/ai";
import { AiBadge } from "./AiBadge";

export interface AiDuplicateWarningProps {
  enabled?: boolean;
  officerName?: string;
  officerId?: string;
  slipDate?: string;
  startTime?: string;
  endTime?: string;
  worksiteId?: string;
  circuitId?: string;
  excludeSlipId?: string;
}

export function AiDuplicateWarning({ enabled = AI_ENABLED, ...props }: AiDuplicateWarningProps) {
  const [result, setResult] = useState<DuplicateResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const ready = !!(props.slipDate && props.startTime && props.endTime && (props.officerName || props.officerId));
  const key = useMemo(() => JSON.stringify(props), [props]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const timer = window.setTimeout(() => {
      ai.checkDuplicate({
        officerName: props.officerName,
        officerId: props.officerId,
        slipDate: props.slipDate!,
        startTime: props.startTime!,
        endTime: props.endTime!,
        worksiteId: props.worksiteId,
        circuitId: props.circuitId,
        excludeSlipId: props.excludeSlipId,
      }).then((next) => {
        setResult(next);
        setDismissed(false);
      }).catch(() => setResult(null));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [enabled, ready, key]);

  if (!enabled || dismissed || !result?.hasDuplicateRisk) return null;
  return (
    <div className="md:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-foreground"><AlertTriangle size={16} /> Possible duplicate slip</div>
        <AiBadge onDismiss={() => setDismissed(true)} />
      </div>
      <ul className="space-y-2">
        {result.candidates.map((candidate) => (
          <li key={candidate.slipId} className="rounded border border-border bg-surface p-2">
            <div className="font-mono text-xs text-muted-foreground">{candidate.slipId}</div>
            <div>{candidate.slipDate} {candidate.startTime}-{candidate.endTime} - score {Math.round(candidate.score * 100)}%</div>
            <div className="text-xs text-muted-foreground">{candidate.reasons.join(", ")}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
