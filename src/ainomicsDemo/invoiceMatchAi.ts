/**
 * Generated with Claude Code.
 * Matches vendor invoice lines to police detail slips for National Grid reconciliation.
 */
export interface InvoiceLine {
  slipId: string;
  hours: number;
  rate: number;
}

export interface MatchResult {
  slipId: string;
  amount: number;
  matched: boolean;
  reason: string;
}

export function lineAmount(line: InvoiceLine): number {
  return Math.round(line.hours * line.rate * 100) / 100;
}

export function matchInvoiceToSlips(
  lines: InvoiceLine[],
  knownSlipIds: Set<string>,
): MatchResult[] {
  return lines.map((line) => {
    const amount = lineAmount(line);
    if (!knownSlipIds.has(line.slipId)) {
      return { slipId: line.slipId, amount, matched: false, reason: "unknown slip" };
    }
    if (line.hours <= 0 || line.rate <= 0) {
      return { slipId: line.slipId, amount, matched: false, reason: "invalid hours or rate" };
    }
    return { slipId: line.slipId, amount, matched: true, reason: "ok" };
  });
}

export function unmatchedTotal(results: MatchResult[]): number {
  return results.filter((r) => !r.matched).reduce((t, r) => t + r.amount, 0);
}

export function matchedTotal(results: MatchResult[]): number {
  return results.filter((r) => r.matched).reduce((t, r) => t + r.amount, 0);
}

/** Fix: treat zero-amount matched lines as unmatched for payment release. */
export function isPayable(result: MatchResult): boolean {
  return result.matched && result.amount > 0;
}
