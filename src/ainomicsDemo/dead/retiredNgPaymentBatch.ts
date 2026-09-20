/**
 * Generated with GitHub Copilot.
 * Retired National Grid payment batch builder — not imported anywhere.
 */
export interface NgPaymentLine {
  detailId: string;
  amount: number;
  costCenter: string;
}

export interface NgPaymentBatch {
  batchId: string;
  lines: NgPaymentLine[];
  createdAt: string;
}

export function createNgPaymentBatch(lines: NgPaymentLine[]): NgPaymentBatch {
  return {
    batchId: `NG-${Date.now()}`,
    lines: [...lines],
    createdAt: new Date().toISOString(),
  };
}

export function ngBatchTotal(batch: NgPaymentBatch): number {
  return Math.round(batch.lines.reduce((t, l) => t + l.amount, 0) * 100) / 100;
}

export function ngLinesForCostCenter(batch: NgPaymentBatch, costCenter: string): NgPaymentLine[] {
  return batch.lines.filter((l) => l.costCenter === costCenter);
}

export function mergeNgBatches(a: NgPaymentBatch, b: NgPaymentBatch): NgPaymentBatch {
  return {
    batchId: `${a.batchId}+${b.batchId}`,
    lines: [...a.lines, ...b.lines],
    createdAt: a.createdAt < b.createdAt ? a.createdAt : b.createdAt,
  };
}

export function validateNgLine(line: NgPaymentLine): string | null {
  if (!line.detailId.trim()) return "missing detail id";
  if (!(line.amount > 0)) return "amount must be positive";
  if (!line.costCenter.trim()) return "missing cost center";
  return null;
}

export function stripInvalidNgLines(lines: NgPaymentLine[]): NgPaymentLine[] {
  return lines.filter((l) => validateNgLine(l) === null);
}
