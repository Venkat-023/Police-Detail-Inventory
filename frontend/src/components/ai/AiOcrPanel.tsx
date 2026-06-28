import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AI_ENABLED } from "@/config/ai";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAiOcr } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export function AiOcrPanel({ enabled = AI_ENABLED, onApply }: { enabled?: boolean; onApply: (field: string, value: string) => void }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const ocr = useAiOcr();
  if (!enabled) return null;

  const onFile = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await ocr.mutateAsync(String(reader.result));
      setFields(result.extractedFields);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Collapsible>
      <section className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
          <span className="inline-flex items-center gap-2 font-medium"><Sparkles size={16} /> Scan paper slip</span>
          <AiBadge prototype />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <input type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0])} className="text-xs" />
          {ocr.isPending && <div className="text-muted-foreground">Reading image...</div>}
          {Object.keys(fields).length > 0 && (
            <div className="space-y-2">
              {Object.entries(fields).map(([field, value]) => (
                <div key={field} className="flex items-center justify-between rounded border border-border bg-surface px-2 py-1">
                  <span>{field}</span><span className="text-muted-foreground">{value || "No value detected"}</span>
                </div>
              ))}
              <button type="button" onClick={() => Object.entries(fields).forEach(([field, value]) => value && onApply(field, value))}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Apply to form
              </button>
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
