/**
 * AI-assisted (Claude Code). Orphaned Arborist export path — no callers in src/.
 */
export type ArboristExportFormat = "csv" | "xlsx" | "pdf";

export function buildArboristExportRows(
  slips: Array<{ id: string; officer: string; hours: number }>,
): string[][] {
  const header = ["slip_id", "officer", "hours"];
  return [header, ...slips.map((s) => [s.id, s.officer, String(s.hours)])];
}

export function arboristExportFilename(format: ArboristExportFormat, when = new Date()): string {
  const stamp = when.toISOString().slice(0, 10);
  return `arborist-export-${stamp}.${format}`;
}

export function countExportHours(rows: string[][]): number {
  if (rows.length < 2) return 0;
  return rows.slice(1).reduce((t, r) => t + (Number(r[2]) || 0), 0);
}

export function isEmptyExport(rows: string[][]): boolean {
  return rows.length <= 1;
}
