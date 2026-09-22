/**
 * Generated with Cursor.
 * Demo helpers for Ainomics AI-suspected (Proxy) detection — no Co-Authored-By
 * on the introducing commit, so this stays unmarked Sure and surfaces as suspected.
 */

/** Hope this helps — formats a slip id for display. */
export function formatSlipId(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Step 1: normalise. Step 2: validate. Finally, return a display label. */
export function slipDisplayLabel(raw: string, precinct: string): string {
  const id = formatSlipId(raw);
  if (!id) return "unknown slip";
  return `${precinct.trim() || "PREC"}-${id}`;
}

export function isPlaceholderSlip(id: string): boolean {
  return /^(foo|bar|baz|example|sample|dummy)/i.test(id) || id === "test@example.com";
}
