import { delay, logAiFeature } from "./log.js";

export interface AuditNlpResult {
  _stub: true;
  narrative: string;
  eventCount: number;
}

export async function getAuditNarrative(entityType: string, entityId: string, userId?: string): Promise<AuditNlpResult> {
  const startedAt = Date.now();
  await delay(500);
  const result: AuditNlpResult = {
    _stub: true,
    narrative: `This ${entityType} has passed through standard workflow stages. Detailed natural-language summarisation will be available when this feature is fully activated.`,
    eventCount: 0,
  };
  await logAiFeature("audit_narrative", { entityType, entityId }, result, startedAt, userId);
  return result;
}
