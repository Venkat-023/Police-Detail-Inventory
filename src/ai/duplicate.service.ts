import { PrismaClient } from "@prisma/client";
import { aiConfig } from "../config/ai.js";

const prisma = new PrismaClient();

export interface DuplicateCandidate {
  slipId: string;
  score: number;
  reasons: string[];
  slipDate: string;
  startTime: string;
  endTime: string;
}

export interface DuplicateResult {
  hasDuplicateRisk: boolean;
  candidates: DuplicateCandidate[];
}

export async function detectDuplicates(params: {
  officerId?: string;
  officerName?: string;
  slipDate: string;
  startTime: string;
  endTime: string;
  worksiteId?: string;
  circuitId?: string;
  excludeSlipId?: string;
}): Promise<DuplicateResult> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - aiConfig.duplicateWindowHours);
  const detailDateStart = new Date(windowStart.toISOString().slice(0, 10));
  const officerName = params.officerName || params.officerId;

  const existing = await prisma.policeSlip.findMany({
    where: {
      officerName,
      detailDate: { gte: detailDateStart },
      id: params.excludeSlipId ? { not: params.excludeSlipId } : undefined,
      status: { not: "Draft" },
    },
    select: {
      id: true,
      detailDate: true,
      timeFrom: true,
      timeTo: true,
      worksiteAddress: true,
      circuitId: true,
    },
  });

  const candidates: DuplicateCandidate[] = [];
  for (const slip of existing) {
    let score = 0;
    const reasons: string[] = [];
    const slipDate = slip.detailDate.toISOString().slice(0, 10);

    if (slipDate === params.slipDate) {
      score += 0.5;
      reasons.push("Same date");
    }

    const overlap = timeOverlapPercent(params.startTime, params.endTime, slip.timeFrom, slip.timeTo);
    if (overlap > 0.5) {
      score += 0.3;
      reasons.push(`${Math.round(overlap * 100)}% time overlap`);
    } else if (overlap > 0) {
      score += 0.1;
      reasons.push("Partial time overlap");
    }

    if (params.worksiteId && slip.worksiteAddress === params.worksiteId) {
      score += 0.1;
      reasons.push("Same worksite");
    }
    if (params.circuitId && slip.circuitId === params.circuitId) {
      score += 0.1;
      reasons.push("Same circuit");
    }

    if (score >= 0.5) {
      candidates.push({ slipId: slip.id, score, reasons, slipDate, startTime: slip.timeFrom, endTime: slip.timeTo });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return { hasDuplicateRisk: candidates.length > 0, candidates };
}

function timeOverlapPercent(s1: string, e1: string, s2: string, e2: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const [a, b, c, d] = [toMin(s1), toMin(e1), toMin(s2), toMin(e2)];
  const overlapStart = Math.max(a, c);
  const overlapEnd = Math.min(b, d);
  if (overlapEnd <= overlapStart) return 0;
  const totalSpan = Math.max(b, d) - Math.min(a, c);
  return totalSpan === 0 ? 0 : (overlapEnd - overlapStart) / totalSpan;
}
