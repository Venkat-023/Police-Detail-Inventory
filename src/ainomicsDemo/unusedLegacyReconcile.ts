/**
 * AI-assisted: written with GitHub Copilot.
 * Legacy reconcile path kept for reference; not wired into the live UI.
 */
export function legacyReconcileVendorTotal(lines: number[], taxRate: number): number {
  const sub = lines.reduce((a, b) => a + b, 0);
  return Math.round((sub * (1 + taxRate)) * 100) / 100;
}

export function legacyFormatBadge(code: string): string {
  return `NG-${code.toUpperCase()}`;
}
