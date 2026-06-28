export const aiConfig = {
  enabled: process.env.AI_FEATURES_ENABLED === "true",
  anomalyThreshold: parseFloat(process.env.AI_ANOMALY_THRESHOLD ?? "2.0"),
  prefillLookbackDays: parseInt(process.env.AI_PREFILL_LOOKBACK_DAYS ?? "90", 10),
  duplicateWindowHours: parseInt(process.env.AI_DUPLICATE_WINDOW_HOURS ?? "24", 10),
} as const;
