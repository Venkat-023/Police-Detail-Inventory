import { Sparkles, X } from "lucide-react";

export function AiBadge({ prototype = false, onDismiss }: { prototype?: boolean; onDismiss?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
        <Sparkles size={12} /> [AI{prototype ? " - Prototype" : ""}]
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss AI panel" className="rounded p-1 text-muted-foreground hover:bg-muted">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
