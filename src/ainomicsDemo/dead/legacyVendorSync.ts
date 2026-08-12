/**
 * Generated with Cursor.
 * LEGACY — never imported by the live app. Kept only so DCA / Ainomics can
 * measure confirmed-unused AI-written code in the assessment window.
 */
export interface LegacyVendorRow {
  vendorId: string;
  slipCode: string;
  hours: number;
  rate: number;
  paid: boolean;
}

export function syncLegacyVendorBatch(rows: LegacyVendorRow[]): number {
  let total = 0;
  for (const row of rows) {
    if (row.paid) continue;
    total += Math.round(row.hours * row.rate * 100) / 100;
  }
  return total;
}

export function formatLegacyVendorKey(vendorId: string, slipCode: string): string {
  return `LEGACY:${vendorId.toUpperCase()}:${slipCode.trim()}`;
}

export function filterUnpaidLegacy(rows: LegacyVendorRow[]): LegacyVendorRow[] {
  return rows.filter((r) => !r.paid && r.hours > 0);
}

export function estimateLegacyOvertime(rows: LegacyVendorRow[], threshold = 8): number {
  return rows.reduce((t, r) => t + Math.max(0, r.hours - threshold), 0);
}

export function legacyPaymentReady(rows: LegacyVendorRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.paid);
}
