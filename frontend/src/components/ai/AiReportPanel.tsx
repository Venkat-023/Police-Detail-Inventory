import { useState } from "react";
import { AI_ENABLED } from "@/config/ai";
import { useAuth } from "@/hooks/useAuth";
import { useAiReport } from "@/hooks/useAi";
import { AiBadge } from "./AiBadge";

export function AiReportPanel({ enabled = AI_ENABLED }: { enabled?: boolean }) {
  const { user } = useAuth();
  const [type, setType] = useState<"billing" | "reconciliation">("billing");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const report = useAiReport();
  if (!enabled || !user) return null;

  return (
    <section className="pdm-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">AI Reports</h2>
        <AiBadge prototype />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="rounded-md border border-input bg-surface px-3 py-2 text-sm">
          <option value="billing">Billing</option>
          <option value="reconciliation">Reconciliation</option>
        </select>
        <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
        <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="rounded-md border border-input bg-surface px-3 py-2 text-sm" />
        <button disabled={report.isPending || !periodStart || !periodEnd} onClick={() => report.mutate({ type, periodStart, periodEnd, organisationId: user.organisationId })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {report.isPending ? "Generating..." : "Generate"}
        </button>
      </div>
      {report.data && (
        <div className="mt-5 space-y-3">
          <h3 className="font-semibold">{report.data.title}</h3>
          {report.data.sections.map((section) => (
            <div key={section.heading} className="rounded-md border border-border bg-surface p-3">
              <div className="font-medium">{section.heading}</div>
              <p className="mt-1 text-sm text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
