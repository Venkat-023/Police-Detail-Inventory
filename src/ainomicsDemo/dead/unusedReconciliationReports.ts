/**
 * Generated with Cursor.
 * Unused reconciliation report builders — zero references in the codebase.
 */
export function unusedWeeklyReconciliationSummary(
  matched: number,
  unmatched: number,
  exceptions: number,
): string {
  return `matched=${matched}; unmatched=${unmatched}; exceptions=${exceptions}`;
}

export function unusedExceptionRate(matched: number, exceptions: number): number {
  const den = matched + exceptions;
  return den === 0 ? 0 : Math.round((1000 * exceptions) / den) / 10;
}

export function unusedSlipAgingBuckets(
  ages: number[],
): { fresh: number; aging: number; stale: number } {
  let fresh = 0;
  let aging = 0;
  let stale = 0;
  for (const d of ages) {
    if (d <= 7) fresh++;
    else if (d <= 30) aging++;
    else stale++;
  }
  return { fresh, aging, stale };
}

export function unusedFormatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function unusedJoinOfficerNames(names: string[]): string {
  return names.map((n) => n.trim()).filter(Boolean).join(", ");
}
