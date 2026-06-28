import { PrismaClient } from "@prisma/client";
import { aiConfig } from "../config/ai.js";

const prisma = new PrismaClient();

export interface PrefillSuggestion {
  field: string;
  value: string;
  label: string;
  confidence: number;
}

export async function getPrefillSuggestions(userId: string): Promise<PrefillSuggestion[]> {
  const since = new Date();
  since.setDate(since.getDate() - aiConfig.prefillLookbackDays);

  const slips = await prisma.policeSlip.findMany({
    where: {
      createdById: userId,
      createdAt: { gte: since },
      status: { not: "Draft" },
    },
    select: {
      region: true,
      arboristDistrict: true,
      arboristId: true,
      workType: true,
      budgetCode: true,
      circuitId: true,
      worksiteAddress: true,
      crewForeman: true,
      arborist: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (slips.length === 0) return [];
  const fields = [
    { field: "region", get: (s: (typeof slips)[number]) => ({ value: s.region, label: s.region }) },
    { field: "arboristDistrict", get: (s: (typeof slips)[number]) => ({ value: s.arboristDistrict, label: s.arboristDistrict }) },
    { field: "arboristId", get: (s: (typeof slips)[number]) => ({ value: s.arboristId, label: s.arborist?.name || s.arboristId }) },
    { field: "workType", get: (s: (typeof slips)[number]) => ({ value: s.workType, label: s.workType }) },
    { field: "budgetCode", get: (s: (typeof slips)[number]) => ({ value: s.budgetCode, label: s.budgetCode }) },
    { field: "circuitId", get: (s: (typeof slips)[number]) => ({ value: s.circuitId, label: s.circuitId }) },
    { field: "worksiteAddress", get: (s: (typeof slips)[number]) => ({ value: s.worksiteAddress, label: s.worksiteAddress }) },
    { field: "crewForeman", get: (s: (typeof slips)[number]) => ({ value: s.crewForeman, label: s.crewForeman }) },
  ];

  const suggestions: PrefillSuggestion[] = [];
  for (const { field, get } of fields) {
    const freq = new Map<string, { count: number; label: string }>();
    for (const slip of slips) {
      const item = get(slip);
      if (!item.value) continue;
      const existing = freq.get(item.value) ?? { count: 0, label: item.label };
      freq.set(item.value, { count: existing.count + 1, label: item.label });
    }
    if (freq.size === 0) continue;
    const [topId, topData] = [...freq.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    suggestions.push({ field, value: topId, label: topData.label, confidence: topData.count / slips.length });
  }

  return suggestions.filter((suggestion) => suggestion.confidence >= 0.3);
}
