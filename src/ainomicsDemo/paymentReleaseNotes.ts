/**
 * Composed with Claude Code — release checklist notes for National Grid payments.
 */
export const PAYMENT_RELEASE_CHECKS = [
  "All detail slips approved",
  "Vendor invoice matched",
  "Arborist sign-off present",
  "No open reconciliation exceptions",
] as const;

export function paymentReady(checks: Record<string, boolean>): boolean {
  return PAYMENT_RELEASE_CHECKS.every((c) => checks[c] === true);
}
