export interface DuplicateCheckParams {
  officerId?: string;
  officerName?: string;
  slipDate: string;
  startTime: string;
  endTime: string;
  worksiteId?: string;
  circuitId?: string;
  excludeSlipId?: string;
}

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

export interface PrefillSuggestion {
  field: string;
  value: string;
  label: string;
  confidence: number;
}

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

export interface ArboristSuggestion {
  _stub: true;
  summary: string;
  recommendation: "confirm" | "reject" | "review";
  confidence: number;
  reasons: string[];
}

export interface ReconcileSuggestion {
  _stub: true;
  suggestedSlipIds: string[];
  projectedStatus: "Reconciled" | "PartiallyReconciled";
  totalMatchedHours: number;
  message: string;
}

export interface AuditNlpResult {
  _stub: true;
  narrative: string;
  eventCount: number;
}

export interface SignatureVerificationResult {
  _stub: true;
  isValid: boolean;
  confidence: number;
  message: string;
}

export interface ReportParams {
  type: "billing" | "reconciliation";
  periodStart: string;
  periodEnd: string;
  organisationId: string;
}

export interface ReportResult {
  _stub: true;
  title: string;
  sections: Array<{ heading: string; body: string }>;
}

export interface OcrResult {
  _stub: true;
  extractedFields: Record<string, string>;
  confidence: number;
  message: string;
}
