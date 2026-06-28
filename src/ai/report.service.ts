import { delay, logAiFeature } from "./log.js";

export interface ReportResult {
  _stub: true;
  title: string;
  sections: Array<{ heading: string; body: string }>;
}

export async function generateReport(type: "billing" | "reconciliation", periodStart: string, periodEnd: string, organisationId: string, userId?: string): Promise<ReportResult> {
  const startedAt = Date.now();
  await delay(800);
  const result: ReportResult = {
    _stub: true,
    title: `${type === "billing" ? "Billing Summary" : "Reconciliation Report"} - Stub`,
    sections: [
      { heading: "Overview", body: "AI-drafted report content will appear here once the report generation feature is fully activated." },
    ],
  };
  await logAiFeature("report_generation", { type, periodStart, periodEnd, organisationId }, result, startedAt, userId);
  return result;
}
