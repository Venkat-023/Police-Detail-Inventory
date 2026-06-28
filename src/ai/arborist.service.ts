import { PrismaClient } from "@prisma/client";
import { delay, logAiFeature } from "./log.js";

const prisma = new PrismaClient();

export interface ArboristSuggestion {
  _stub: true;
  summary: string;
  recommendation: "confirm" | "reject" | "review";
  confidence: number;
  reasons: string[];
}

export async function getArboristSuggestion(slipId: string, userId?: string): Promise<ArboristSuggestion> {
  const startedAt = Date.now();
  await delay(400);
  const slip = await prisma.policeSlip.findUniqueOrThrow({
    where: { id: slipId },
    include: { arborist: true },
  });
  const result: ArboristSuggestion = {
    _stub: true,
    summary: `Slip submitted for ${slip.workType} at ${slip.worksiteAddress} by officer ${slip.officerName}. Claimed hours: ${slip.hoursToBeBilled}.`,
    recommendation: "confirm",
    confidence: 0.72,
    reasons: [
      "Hours are within normal range for this work type",
      "No duplicate slips detected for this officer today",
      "Officer has no prior non-billable flags",
    ],
  };
  await logAiFeature("arborist_suggestion", { slipId }, result, startedAt, userId);
  return result;
}
