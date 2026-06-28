import { PrismaClient } from "@prisma/client";
import { aiConfig } from "../config/ai.js";

const prisma = new PrismaClient();

export interface AnomalyFlag {
  slipId?: string;
  type: "slip_hours" | "invoice_total" | "officer_frequency";
  severity: "low" | "medium" | "high";
  message: string;
  zScore?: number;
  observed: number;
  expected: number;
}

export interface AnomalyResult {
  hasAnomalies: boolean;
  flags: AnomalyFlag[];
  analysedAt: string;
}

export async function analyseInvoiceAnomalies(invoiceId: string): Promise<AnomalyResult> {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { slips: true, contractCompany: true },
  });
  const flags: AnomalyFlag[] = [];

  for (const slip of invoice.slips) {
    const population = await prisma.policeSlip.findMany({
      where: { workType: slip.workType, vendorCompanyId: invoice.contractCompanyId },
      select: { hoursToBeBilled: true },
    });
    const hours = population.map((item) => Number(item.hoursToBeBilled)).filter(Number.isFinite);
    if (hours.length < 5) continue;
    const mean = average(hours);
    const std = standardDeviation(hours, mean);
    if (std === 0) continue;
    const observed = Number(slip.hoursToBeBilled);
    const z = (observed - mean) / std;
    if (Math.abs(z) > aiConfig.anomalyThreshold) {
      flags.push({
        slipId: slip.id,
        type: "slip_hours",
        severity: Math.abs(z) > aiConfig.anomalyThreshold * 1.5 ? "high" : "medium",
        message: `Slip hours (${observed}h) are ${z > 0 ? "above" : "below"} normal for work type "${slip.workType}" (avg ${mean.toFixed(1)}h)`,
        zScore: parseFloat(z.toFixed(2)),
        observed,
        expected: parseFloat(mean.toFixed(2)),
      });
    }
  }

  const pastInvoices = await prisma.invoice.findMany({
    where: { contractCompanyId: invoice.contractCompanyId, status: { in: ["Reconciled", "Paid"] } },
    select: { totalHours: true },
  });
  const invoiceTotals = pastInvoices.map((item) => hhmmToHours(item.totalHours)).filter(Number.isFinite);
  const observedInvoiceHours = hhmmToHours(invoice.totalHours);
  if (invoiceTotals.length >= 5 && Number.isFinite(observedInvoiceHours)) {
    const mean = average(invoiceTotals);
    const std = standardDeviation(invoiceTotals, mean);
    if (std > 0) {
      const z = (observedInvoiceHours - mean) / std;
      if (Math.abs(z) > aiConfig.anomalyThreshold) {
        flags.push({
          type: "invoice_total",
          severity: Math.abs(z) > aiConfig.anomalyThreshold * 1.5 ? "high" : "medium",
          message: `Invoice total (${observedInvoiceHours.toFixed(1)}h) is ${z > 0 ? "unusually high" : "unusually low"} vs historical average (${mean.toFixed(1)}h)`,
          zScore: parseFloat(z.toFixed(2)),
          observed: parseFloat(observedInvoiceHours.toFixed(2)),
          expected: parseFloat(mean.toFixed(2)),
        });
      }
    }
  }

  return { hasAnomalies: flags.length > 0, flags, analysedAt: new Date().toISOString() };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], mean: number) {
  return Math.sqrt(values.map((value) => (value - mean) ** 2).reduce((sum, value) => sum + value, 0) / values.length);
}

function hhmmToHours(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours + minutes / 60;
}
