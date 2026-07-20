/**
 * Generated with Cursor.
 * This helper module was written using Cursor Agent for the Ainomics demo assessment.
 */
export type SlipStatus = "draft" | "submitted" | "approved" | "rejected";

/** Map a raw status string from a detail slip form. */
export function normalizeSlipStatus(raw: string): SlipStatus {
  const v = raw.trim().toLowerCase();
  if (v === "draft" || v === "submitted" || v === "approved" || v === "rejected") return v;
  return "draft";
}

/** Estimate overtime hours from start/end clock times (HH:mm). */
export function estimateOvertimeHours(start: string, end: string, threshold = 8): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const mins = Math.max(0, toMin(end) - toMin(start));
  return Math.max(0, mins / 60 - threshold);
}
