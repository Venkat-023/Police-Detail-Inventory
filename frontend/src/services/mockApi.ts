import { useAuthStore } from "@/store/authStore";
import type {
  ApiError,
  AuditEntry,
  Invoice,
  InvoiceStatus,
  Organisation,
  PoliceSlip,
  Role,
  SlipStatus,
  User,
} from "@/types";
import type {
  AnomalyResult,
  ArboristSuggestion,
  AuditNlpResult,
  DuplicateCheckParams,
  DuplicateResult,
  OcrResult,
  PrefillSuggestion,
  ReconcileSuggestion,
  ReportParams,
  ReportResult,
  SignatureVerificationResult,
} from "@/types/ai";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  meta?: { page?: number; perPage?: number; total?: number };
  error?: { code: string; message: string; fieldErrors?: unknown };
};

export function resetMockDb() {
  localStorage.removeItem("pdm_mock_db_v1");
}

function token() {
  return useAuthStore.getState().token;
}

function apiError(code: string, message: string, details?: unknown): ApiError {
  return { code, message, details };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.method && !["GET", "HEAD"].includes(options.method)) headers.set("X-PDM-Request", "true");
  const authToken = token();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || payload.success === false) {
    const code = payload.error?.code || "REQUEST_FAILED";
    const details = payload.error?.fieldErrors;
    if (code === "CONFLICT" && Array.isArray(details)) {
      const existing = (details[0] as any)?.existingSlipId;
      if (existing) throw apiError("DUPLICATE_SLIP", payload.error?.message || "Duplicate slip", { existingSlipId: existing });
    }
    if (code === "VALIDATION_ERROR" && Array.isArray(details) && details.some((d: any) => [
      "officerBadgeNumber",
      "officerIdDocumentUrl",
      "entryPhotoUrl",
      "exitPhotoUrl",
      "locationVerified",
      "timestampVerified",
      "identityVerificationStatus",
    ].includes(d.field))) {
      throw apiError("EVIDENCE_REQUIRED", payload.error?.message || "Police badge and geo-tag evidence are required", details);
    }
    throw apiError(code, payload.error?.message || response.statusText, details);
  }
  return payload.data as T;
}

async function aiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.method && !["GET", "HEAD"].includes(options.method)) headers.set("X-PDM-Request", "true");
  const authToken = token();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw apiError(payload?.error?.code || "AI_REQUEST_FAILED", payload?.error?.message || payload?.error || response.statusText, payload);
  return payload as T;
}

function withPermissionAliases(permissions: string[]) {
  const result = new Set(permissions);
  if (permissions.includes("slips:update") || permissions.includes("slips:*") || permissions.includes("*")) {
    result.add("slips:transition:billable");
    result.add("slips:transition:confirmed");
    result.add("slips:transition:nonbillable");
  }
  if (permissions.includes("invoices:pay") || permissions.includes("invoices:*") || permissions.includes("*")) {
    result.add("invoices:pay");
  }
  if (permissions.includes("users:*") || permissions.includes("*")) {
    result.add("users:read");
    result.add("users:create");
    result.add("users:update");
    result.add("roles:read");
    result.add("roles:create");
    result.add("roles:update");
    result.add("audit:read");
    result.add("orgs:read");
  }
  return Array.from(result);
}

function toUser(raw: any): User {
  const role = raw.role || {};
  const org = raw.organisation || {};
  const permissions = withPermissionAliases(role.permissions || raw.permissions || []);
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || "",
    organisationId: org.id || raw.organisationId,
    organisationName: org.name || raw.organisationName || "",
    roleId: role.id || raw.roleId,
    roleName: role.name || raw.roleName,
    scope: org.type || raw.scope || role.type,
    permissions,
    active: raw.isActive ?? raw.active ?? true,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function toRole(raw: any): Role & { usersAssigned?: number } {
  return {
    id: raw.id,
    name: raw.name,
    scope: raw.type || raw.scope,
    type: raw.appScope === "pdm" ? "System" : (raw.type || "Custom"),
    permissions: withPermissionAliases(raw.permissions || []),
    usersAssigned: raw._count?.users ?? raw.usersAssigned ?? 0,
  } as Role & { usersAssigned?: number };
}

function toOrganisation(raw: any): Organisation {
  return {
    id: raw.id,
    name: raw.name,
    scope: raw.type || raw.scope,
    active: raw.active ?? true,
  };
}

function toSlip(raw: any): PoliceSlip {
  return {
    ...raw,
    slipNumber: raw.slipNumber || `PDM-${String(raw.id).slice(0, 8).toUpperCase()}`,
    detailDate: String(raw.detailDate).slice(0, 10),
    hoursWorked: Number(raw.hoursWorked),
    hoursToBeBilled: Number(raw.hoursToBeBilled),
    organisationId: raw.organisationId || raw.vendorCompanyId,
    vendorCompany: raw.vendorCompany || raw.vendorCompanyId,
    arboristName: raw.arboristName || raw.arboristId,
    createdByName: raw.createdByName || raw.createdById,
    invoiceId: raw.invoiceId || undefined,
  };
}

function toInvoice(raw: any): Invoice {
  return {
    ...raw,
    invoiceDate: String(raw.invoiceDate).slice(0, 10),
    invoiceAmount: Number(raw.invoiceAmount),
    organisationId: raw.organisationId || raw.contractCompanyId,
    vendorCompany: raw.vendorCompany || raw.contractCompanyId,
    attachedSlipIds: raw.attachedSlipIds || raw.slips?.map((s: any) => s.id) || [],
  };
}

function toAudit(raw: any): AuditEntry {
  return {
    id: raw.id,
    entityType: raw.entityType === "PoliceSlip" ? "Slip" : raw.entityType,
    entityId: raw.entityId,
    timestamp: raw.timestamp,
    actorId: raw.actorId,
    actorName: raw.metadata?.actorName || raw.actorId,
    actorRole: raw.metadata?.actorRole || "NG Super Admin",
    action: raw.action,
    fromState: raw.fromState || undefined,
    toState: raw.toState || undefined,
    ipAddress: raw.metadata?.ip || "",
    meta: raw.metadata,
  };
}

function slipPayload(data: Partial<PoliceSlip> & { submitAsBillable?: boolean; bypassDuplicateCheck?: boolean }) {
  const payload: any = {
    ...data,
    worksiteCountry: "US",
    worksiteAddress: data.worksiteAddress || "Local workflow test address",
  }
  if (payload.officerIdDocumentUrl) {
    payload.identityVerificationType ||= "PoliceBadge";
    payload.identityVerificationStatus ||= "Verified";
  }
  delete payload.slipNumber;
  delete payload.organisationId;
  delete payload.vendorCompany;
  delete payload.arboristName;
  delete payload.createdById;
  delete payload.createdByName;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.status;
  delete payload.invoiceId;
  return payload;
}

export const mockApi = {
  async login(email: string, password: string) {
    const data = await request<{ accessToken: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return { token: data.accessToken, user: toUser(data.user) };
  },

  async listSlips(_currentUser: User, opts: {
    status?: SlipStatus | "all";
    onlyMine?: boolean;
    region?: string;
    district?: string;
    vendorCompany?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (opts.status && opts.status !== "all") params.set("status", opts.status);
    if (opts.region) params.set("region", opts.region);
    if (opts.district) params.set("arboristDistrict", opts.district);
    if (opts.dateFrom) params.set("dateFrom", opts.dateFrom);
    if (opts.dateTo) params.set("dateTo", opts.dateTo);
    if (opts.page) params.set("page", String(opts.page));
    if (opts.pageSize) params.set("perPage", String(opts.pageSize));
    const query = params.toString();
    const raw = await request<any[]>(`/slips${query ? `?${query}` : ""}`);
    let items = raw.map(toSlip);
    if (opts.onlyMine) items = items.filter((slip) => slip.createdById === _currentUser.id);
    if (opts.vendorCompany) items = items.filter((slip) => slip.vendorCompany === opts.vendorCompany);
    return { items, total: items.length, page: opts.page ?? 1, pageSize: opts.pageSize ?? 20 };
  },

  async getSlip(_currentUser: User, id: string) {
    return toSlip(await request<any>(`/slips/${id}`));
  },

  async createSlip(_currentUser: User, data: Partial<PoliceSlip> & { submitAsBillable?: boolean; bypassDuplicateCheck?: boolean }) {
    return toSlip(await request<any>("/slips", { method: "POST", body: JSON.stringify(slipPayload(data)) }));
  },

  async updateSlip(_currentUser: User, id: string, patch: Partial<PoliceSlip> & { submitAsBillable?: boolean }) {
    const { submitAsBillable, ...rest } = patch;
    const slip = toSlip(await request<any>(`/slips/${id}`, { method: "PUT", body: JSON.stringify(slipPayload(rest)) }));
    if (submitAsBillable) return this.transitionSlip(_currentUser, id, "Billable");
    return slip;
  },

  async transitionSlip(_currentUser: User, id: string, target: SlipStatus, reason?: string) {
    return toSlip(await request<any>(`/slips/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: target, reason }),
    }));
  },

  async listInvoices(_currentUser: User, opts: { status?: InvoiceStatus | "all"; vendorCompany?: string; dateFrom?: string; dateTo?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.status && opts.status !== "all") params.set("status", opts.status);
    const query = params.toString();
    let invoices = (await request<any[]>(`/invoices${query ? `?${query}` : ""}`)).map(toInvoice);
    if (opts.vendorCompany) invoices = invoices.filter((invoice) => invoice.vendorCompany === opts.vendorCompany);
    if (opts.dateFrom) invoices = invoices.filter((invoice) => invoice.invoiceDate >= opts.dateFrom!);
    if (opts.dateTo) invoices = invoices.filter((invoice) => invoice.invoiceDate <= opts.dateTo!);
    return invoices;
  },

  async getInvoice(_currentUser: User, id: string) {
    const raw = await request<{ invoice: any; attachedSlips: any[] }>(`/invoices/${id}`);
    return { invoice: toInvoice(raw.invoice), attachedSlips: raw.attachedSlips.map(toSlip) };
  },

  async createInvoice(currentUser: User, data: { ngInvoiceNumber: string; vendorInvoiceNumber?: string; totalHours: string; invoiceAmount: number; invoiceDate: string }) {
    return toInvoice(await request<any>("/invoices", {
      method: "POST",
      body: JSON.stringify({ ...data, contractCompanyId: currentUser.organisationId }),
    }));
  },

  async listAvailableConfirmedSlips(_currentUser: User, invoiceId: string) {
    return (await request<any[]>(`/invoices/${invoiceId}/available-slips`)).map(toSlip);
  },

  async saveReconciliation(_currentUser: User, invoiceId: string, attachedSlipIds: string[]) {
    return toInvoice(await request<any>(`/invoices/${invoiceId}/reconcile`, {
      method: "POST",
      body: JSON.stringify({ slipIds: attachedSlipIds }),
    }));
  },

  async markInvoicePaid(_currentUser: User, invoiceId: string) {
    return toInvoice(await request<any>(`/invoices/${invoiceId}/mark-paid`, { method: "PATCH", body: JSON.stringify({}) }));
  },

  async listUsers(_currentUser: User) {
    return (await request<any[]>("/users")).map(toUser);
  },

  async createUser(_currentUser: User, data: Partial<User> & { roleId: string }) {
    return toUser(await request<any>("/users", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        organisationId: data.organisationId,
        roleId: data.roleId,
        password: "Test1234!",
      }),
    }));
  },

  async updateUser(_currentUser: User, id: string, patch: Partial<Pick<User, "name" | "phone" | "roleId" | "active">>) {
    const updated = await request<any>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: patch.name, phone: patch.phone, roleId: patch.roleId }),
    });
    if (typeof patch.active === "boolean") {
      await request(`/users/${id}/${patch.active ? "reactivate" : "deactivate"}`, { method: "PATCH", body: JSON.stringify({}) });
    }
    return toUser({ ...updated, isActive: patch.active ?? updated.isActive });
  },

  async listRoles(_currentUser: User) {
    return (await request<any[]>("/roles")).map(toRole);
  },

  async createRole(_currentUser: User, data: { name: string; scope: "Vendor" | "Utility"; permissions: string[] }) {
    return toRole(await request<any>("/roles", {
      method: "POST",
      body: JSON.stringify({ name: data.name, type: data.scope, permissions: data.permissions }),
    }));
  },

  async updateRole(_currentUser: User, id: string, patch: { name?: string; scope?: "Vendor" | "Utility"; permissions?: string[] }) {
    return toRole(await request<any>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: patch.name, type: patch.scope, permissions: patch.permissions }),
    }));
  },

  async listOrganisations() {
    return (await request<any[]>("/organisations")).map(toOrganisation);
  },

  async listArborists() {
    return request<Array<{ id: string; name: string }>>("/arborists");
  },

  async listAudit(_currentUser: User, opts: { entityType?: string; actor?: string; dateFrom?: string; dateTo?: string; entityId?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.entityType) params.set("entityType", opts.entityType === "Slip" ? "PoliceSlip" : opts.entityType);
    if (opts.entityId) params.set("entityId", opts.entityId);
    return (await request<any[]>(`/audit-logs${params.toString() ? `?${params}` : ""}`)).map(toAudit);
  },

  async listAuditForEntity(_currentUser: User, entityId: string) {
    return (await request<any[]>(`/slips/${entityId}/audit`)).map(toAudit);
  },

  async dashboardStats(currentUser: User) {
    const hasAnyPermission = (checks: string[]) =>
      currentUser.permissions.some((permission) => permission === "*" || checks.includes(permission));
    const [slips, invoices, users] = await Promise.all([
      currentUser.permissions.some((p) => p === "*" || p === "slips:*" || p === "slips:read")
        ? this.listSlips(currentUser, { pageSize: 100 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 100 }))
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
      hasAnyPermission(["invoices:*", "invoices:read", "invoices:create", "invoices:update", "invoices:reconcile", "invoices:pay"])
        ? this.listInvoices(currentUser).catch(() => [])
        : Promise.resolve([]),
      currentUser.permissions.some((p) => p === "*" || p === "users:*" || p === "users:read") ? this.listUsers(currentUser).catch(() => []) : Promise.resolve([]),
    ]);
    const allSlips = slips.items;
    const countBy = <T extends string>(list: { status: T }[], status: T) => list.filter((item) => item.status === status).length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      mySlipsDraft: countBy(allSlips.filter((s) => s.createdById === currentUser.id), "Draft"),
      mySlipsBillable: countBy(allSlips.filter((s) => s.createdById === currentUser.id), "Billable"),
      mySlipsConfirmed: countBy(allSlips.filter((s) => s.createdById === currentUser.id), "Confirmed"),
      mySlipsNonBillable: countBy(allSlips.filter((s) => s.createdById === currentUser.id), "NonBillable"),
      orgSlipsDraft: countBy(allSlips, "Draft"),
      orgSlipsBillable: countBy(allSlips, "Billable"),
      orgSlipsConfirmed: countBy(allSlips, "Confirmed"),
      orgSlipsNonBillable: countBy(allSlips, "NonBillable"),
      invoiceConfirmedAvailable: allSlips.filter((s) => s.status === "Confirmed" && !s.invoiceId).length,
      invoiceNotReconciled: countBy(invoices, "NotReconciled"),
      invoicePartiallyReconciled: countBy(invoices, "PartiallyReconciled"),
      invoiceReconciled: countBy(invoices, "Reconciled"),
      invoicePaid: countBy(invoices, "Paid"),
      activeUsers: users.filter((u) => u.active).length,
      pendingReview: allSlips.filter((s) => s.status === "Billable").length,
      confirmedToday: 0,
      nonBillableThisMonth: allSlips.filter((s) => s.status === "NonBillable" && new Date(s.updatedAt) >= monthStart).length,
      reconciledAwaitingPayment: countBy(invoices, "Reconciled"),
      totalPaidThisMonth: invoices.filter((i) => i.status === "Paid" && i.paidAt && new Date(i.paidAt) >= monthStart).reduce((sum, invoice) => sum + invoice.invoiceAmount, 0),
      totalPending: invoices.filter((i) => i.status === "Reconciled").reduce((sum, invoice) => sum + invoice.invoiceAmount, 0),
      totalSlips: allSlips.length,
      totalInvoices: invoices.length,
      activeVendors: 0,
      auditEntriesToday: 0,
      failedLogins24h: 0,
    };
  },
};

const fallbackAi = {
  prefill: {
    suggestions: [
      { field: "region", value: "Boston Metro", label: "Boston Metro", confidence: 0.64 },
      { field: "workType", value: "HTMP", label: "HTMP", confidence: 0.58 },
      { field: "budgetCode", value: "AVIS-DETAIL", label: "AVIS-DETAIL", confidence: 0.52 },
    ],
  } satisfies { suggestions: PrefillSuggestion[] },
  duplicate: {
    hasDuplicateRisk: false,
    candidates: [],
  } satisfies DuplicateResult,
  anomaly: {
    hasAnomalies: false,
    flags: [],
    analysedAt: new Date().toISOString(),
  } satisfies AnomalyResult,
  arborist: {
    _stub: true,
    summary: "Prototype review: hours, work type, and verification evidence appear consistent with the submitted detail.",
    recommendation: "confirm",
    confidence: 0.72,
    reasons: [
      "Submitted hours are within a normal review range",
      "Required evidence fields are present or pending normal workflow validation",
      "No local duplicate warning is available for this slip",
    ],
  } satisfies ArboristSuggestion,
  reconcile: {
    _stub: true,
    suggestedSlipIds: [],
    projectedStatus: "PartiallyReconciled",
    totalMatchedHours: 0,
    message: "Prototype suggestion: attach confirmed slips whose billed hours match the invoice total, then save reconciliation.",
  } satisfies ReconcileSuggestion,
  audit: {
    _stub: true,
    narrative: "Prototype audit summary: this record is following the standard PDM workflow. Detailed AI summaries are shown here when the AI backend is enabled.",
    eventCount: 0,
  } satisfies AuditNlpResult,
  signature: {
    _stub: true,
    isValid: true,
    confidence: 0.88,
    message: "Prototype signature check: signature is accepted for demo purposes.",
  } satisfies SignatureVerificationResult,
  report: (params: ReportParams): ReportResult => ({
    _stub: true,
    title: `${params.type === "billing" ? "Billing Summary" : "Reconciliation Report"} - Prototype`,
    sections: [
      {
        heading: "Overview",
        body: `Prototype report for ${params.periodStart} through ${params.periodEnd}. Enable AI services for generated analysis; this local summary keeps the workflow visible.`,
      },
      {
        heading: "Recommended Review",
        body: "Check high-hour invoices, partially reconciled items, and slips returned for revision before closing the period.",
      },
    ],
  }),
  ocr: {
    _stub: true,
    extractedFields: {
      detailDate: "",
      timeFrom: "08:00",
      timeTo: "16:00",
      officerName: "",
      worksiteAddress: "",
    },
    confidence: 0,
    message: "Prototype OCR preview: upload accepted. Enable document intelligence for real field extraction.",
  } satisfies OcrResult,
};

export const ai = {
  checkDuplicate: (params: DuplicateCheckParams) =>
    aiRequest<DuplicateResult>("/ai/slips/duplicate-check", { method: "POST", body: JSON.stringify(params) }).catch(() => fallbackAi.duplicate),

  getPrefill: () =>
    aiRequest<{ suggestions: PrefillSuggestion[] }>("/ai/slips/prefill").catch(() => fallbackAi.prefill),

  getInvoiceAnomalies: (invoiceId: string) =>
    aiRequest<AnomalyResult>(`/ai/invoices/${invoiceId}/anomalies`).catch(() => ({ ...fallbackAi.anomaly, analysedAt: new Date().toISOString() })),

  getArboristSuggestion: (slipId: string) =>
    aiRequest<ArboristSuggestion>(`/ai/slips/${slipId}/arborist-suggestion`).catch(() => fallbackAi.arborist),

  getReconcileSuggestion: (invoiceId: string) =>
    aiRequest<ReconcileSuggestion>(`/ai/invoices/${invoiceId}/reconcile-suggestion`).catch(() => fallbackAi.reconcile),

  getAuditNarrative: (entityType: string, entityId: string) =>
    aiRequest<AuditNlpResult>(`/ai/audit/${entityType}/${entityId}/narrative`).catch(() => fallbackAi.audit),

  verifySignature: (slipId: string) =>
    aiRequest<SignatureVerificationResult>(`/ai/slips/${slipId}/signature-verification`).catch(() => fallbackAi.signature),

  generateReport: (params: ReportParams) =>
    aiRequest<ReportResult>("/ai/reports/generate", { method: "POST", body: JSON.stringify(params) }).catch(() => fallbackAi.report(params)),

  extractOcr: (imageBase64: string) =>
    aiRequest<OcrResult>("/ai/ocr/slip", { method: "POST", body: JSON.stringify({ imageBase64 }) }).catch(() => fallbackAi.ocr),
};
