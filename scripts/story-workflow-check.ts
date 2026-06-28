import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3001";
const apiBase = `${baseUrl}/api/v1`;
const password = process.env.TEST_PASSWORD || "Test1234!";

type CheckStatus = "PASS" | "FAIL" | "GAP" | "WARN";
type Check = {
  persona: string;
  story: string;
  check: string;
  status: CheckStatus;
  details: string;
};

type Session = {
  email: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    roleName?: string;
    role?: { name: string; permissions: string[] };
    orgType: "Vendor" | "Utility";
    permissions: string[];
  };
};

const checks: Check[] = [];

function add(persona: string, story: string, check: string, status: CheckStatus, details: string) {
  checks.push({ persona, story, check, status, details });
  const icon = status.padEnd(4);
  console.log(`${icon} | ${persona} | ${check} | ${details}`);
}

async function request<T = any>(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.method && init.method !== "GET") headers.set("x-pdm-request", "true");

  const res = await fetch(path.startsWith("http") ? path : `${apiBase}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: body as T };
}

function assertData<T>(response: { ok: boolean; status: number; body: any }, context: string): T {
  if (!response.ok || !response.body?.success) {
    throw new Error(`${context} failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.data as T;
}

async function login(email: string): Promise<Session> {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  const data = assertData<any>(response, `login ${email}`);
  return { email, token: data.accessToken, user: data.user };
}

function persona(session: Session) {
  return session.user.roleName || session.user.role?.name || session.user.email;
}

function isoDate(daysAgo = 1) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function slipPayload(arboristId: string, suffix: string, submitAsBillable: boolean, overrides: Record<string, unknown> = {}) {
  const detailDate = isoDate();
  return {
    region: "Massachusetts",
    arboristDistrict: "Worcester",
    arboristId,
    workType: "HTMP",
    budgetCode: `QA-${suffix}`,
    circuitId: `CIR-${suffix}`,
    worksiteCountry: "US",
    worksiteAddress: "100 Main Street, Worcester, MA",
    worksiteLatitude: 42.2626,
    worksiteLongitude: -71.8023,
    crewForeman: "QA Foreman",
    crewForemanPhone: "555-777-1234",
    detailDate,
    detailType: "Hourly",
    timeFrom: "08:00",
    timeTo: "16:00",
    hoursWorked: 8,
    officerName: `Officer QA ${suffix}`,
    officerEmail: `officer.qa.${suffix}@example.com`,
    officerPhone: "555-888-1234",
    officerRank: "Officer",
    cruiserNumber: `CR-${suffix}`,
    billingDepartment: "Vegetation Management",
    hoursToBeBilled: 8,
    officerBadgeNumber: `BADGE-${suffix}`,
    identityVerificationType: "PoliceBadge",
    identityVerificationStatus: "Verified",
    officerIdDocumentUrl: `uploads/identity/badge-${suffix}.jpg`,
    entryPhotoUrl: `uploads/verification/entry-${suffix}.jpg`,
    entryPhotoLatitude: 42.2627,
    entryPhotoLongitude: -71.8022,
    entryPhotoTakenAt: `${detailDate}T12:00:00.000Z`,
    exitPhotoUrl: `uploads/verification/exit-${suffix}.jpg`,
    exitPhotoLatitude: 42.2627,
    exitPhotoLongitude: -71.8022,
    exitPhotoTakenAt: `${detailDate}T20:00:00.000Z`,
    submitAsBillable,
    bypassDuplicateCheck: true,
    ...overrides
  };
}

async function createBillable(gf: Session, arboristId: string, suffix: string, hours = 8) {
  const response = await request(
    "/slips",
    { method: "POST", body: JSON.stringify(slipPayload(arboristId, suffix, true, { hoursWorked: hours, hoursToBeBilled: hours })) },
    gf.token
  );
  return assertData<any>(response, `create billable slip ${suffix}`);
}

async function confirmSlip(arborist: Session, slipId: string) {
  const response = await request(
    `/slips/${slipId}/status`,
    { method: "PATCH", body: JSON.stringify({ status: "Confirmed" }) },
    arborist.token
  );
  return assertData<any>(response, `confirm slip ${slipId}`);
}

async function main() {
  const health = await request(`${baseUrl}/health`);
  if (!health.ok) throw new Error(`Backend health failed: ${health.status}`);

  const sessions = {
    gf: await login("gf@avis.com"),
    billing: await login("billing@avis.com"),
    vendorAdmin: await login("admin@avis.com"),
    arborist: await login("arborist@nationalgrid.com"),
    ngDetail: await login("finance@nationalgrid.com"),
    ngSuper: await login("super@nationalgrid.com")
  };

  for (const session of Object.values(sessions)) {
    add(persona(session), "Persona access", "Login with seeded account", "PASS", `${session.email} authenticated`);
  }

  const routeChecks = await Promise.all([
    request(`${process.env.FRONTEND_URL || "http://localhost:3000"}/`),
    request(`${process.env.FRONTEND_URL || "http://localhost:3000"}/slips/`),
    request(`${process.env.FRONTEND_URL || "http://localhost:3000"}/invoices/`)
  ]);
  add("All", "Navigation", "Frontend route shell responds", routeChecks.every((r) => r.status === 200) ? "PASS" : "FAIL", `Statuses: ${routeChecks.map((r) => r.status).join(", ")}`);

  const arborists = assertData<any[]>(await request("/arborists", {}, sessions.gf.token), "load arborists");
  const arboristId = arborists[0]?.id;
  if (!arboristId) throw new Error("No arborist seed data found.");

  const unique = `${Date.now()}`.slice(-8);

  const emptySlip = await request("/slips", { method: "POST", body: JSON.stringify({}) }, sessions.gf.token);
  add("Vendor GF", "Create New Slip", "Mandatory validation rejects empty slip", emptySlip.status === 422 ? "PASS" : "FAIL", `HTTP ${emptySlip.status}`);

  const partialDraft = await request(
    "/slips",
    { method: "POST", body: JSON.stringify({ region: "Massachusetts", submitAsBillable: false }) },
    sessions.gf.token
  );
  const partialDraftData = partialDraft.ok ? (partialDraft.body as any).data : null;
  add("Vendor GF", "Create New Slip", "Save partial draft from incomplete form", partialDraft.ok && partialDraftData?.status === "Draft" ? "PASS" : "FAIL", `HTTP ${partialDraft.status}${partialDraftData?.slipNumber ? `, slip ${partialDraftData.slipNumber}` : ""}`);

  const draft = assertData<any>(
    await request("/slips", { method: "POST", body: JSON.stringify(slipPayload(arboristId, `${unique}D`, false)) }, sessions.gf.token),
    "create draft slip"
  );
  add("Vendor GF", "Create New Slip", "Create complete draft slip", draft.status === "Draft" ? "PASS" : "FAIL", `Slip ${draft.slipNumber} status ${draft.status}`);

  const missingEvidence = { ...slipPayload(arboristId, `${unique}E`, true) };
  delete (missingEvidence as any).entryPhotoUrl;
  const evidenceResponse = await request("/slips", { method: "POST", body: JSON.stringify(missingEvidence) }, sessions.gf.token);
  add("Vendor GF", "Create New Slip", "Billable submission requires badge and geo evidence", evidenceResponse.status === 422 ? "PASS" : "FAIL", `HTTP ${evidenceResponse.status}`);

  const billable = await createBillable(sessions.gf, arboristId, `${unique}B`, 8);
  add("Vendor GF", "Create New Slip", "Submit billable slip with police badge and entry/exit geo photos", billable.status === "Billable" && billable.locationVerified && billable.timestampVerified ? "PASS" : "FAIL", `Status ${billable.status}, locationVerified=${billable.locationVerified}, timestampVerified=${billable.timestampVerified}`);
  add("Vendor GF", "Create New Slip", "Photo geotag source", "WARN", "Workflow records browser geolocation at upload time; it does not yet parse EXIF metadata from the photo file.");

  const confirmed = await confirmSlip(sessions.arborist, billable.id);
  add("NG Arborist", "Confirm Billable Slip", "Confirm billable slip", confirmed.status === "Confirmed" ? "PASS" : "FAIL", `Slip ${confirmed.slipNumber} status ${confirmed.status}`);

  const rejectCandidate = await createBillable(sessions.gf, arboristId, `${unique}N`, 4);
  const nonBillable = assertData<any>(
    await request(
      `/slips/${rejectCandidate.id}/status`,
      { method: "PATCH", body: JSON.stringify({ status: "NonBillable", reason: "QA rejection comment" }) },
      sessions.arborist.token
    ),
    "mark nonbillable"
  );
  add("NG Arborist", "Confirm Billable Slip", "Reject billable slip with comments", nonBillable.status === "NonBillable" ? "PASS" : "FAIL", `Slip ${nonBillable.slipNumber} status ${nonBillable.status}`);
  const returnCandidate = await createBillable(sessions.gf, arboristId, `${unique}R`, 6);
  const returned = assertData<any>(
    await request(
      `/slips/${returnCandidate.id}/status`,
      { method: "PATCH", body: JSON.stringify({ status: "ReturnedForRevision", reason: "QA revision comment" }) },
      sessions.arborist.token
    ),
    "return for revision"
  );
  add("NG Arborist", "Confirm Billable Slip", "Return slip for revision", returned.status === "ReturnedForRevision" ? "PASS" : "FAIL", `Slip ${returned.slipNumber} status ${returned.status}`);
  const resubmitted = assertData<any>(
    await request(
      `/slips/${returnCandidate.id}/status`,
      { method: "PATCH", body: JSON.stringify({ status: "Billable" }) },
      sessions.gf.token
    ),
    "resubmit returned slip"
  );
  add("Vendor GF", "Create New Slip", "Resubmit returned slip after revision", resubmitted.status === "Billable" ? "PASS" : "FAIL", `Slip ${resubmitted.slipNumber} status ${resubmitted.status}`);

  const invoice = assertData<any>(
    await request(
      "/invoices",
      {
        method: "POST",
        body: JSON.stringify({
          contractCompanyId: "00000000-0000-0000-0000-000000000002",
          ngInvoiceNumber: `NG-QA-${unique}`,
          vendorInvoiceNumber: `V-QA-${unique}`,
          totalHours: "08:00",
          invoiceAmount: 800,
          invoiceDate: isoDate()
        })
      },
      sessions.billing.token
    ),
    "create invoice"
  );
  add("Vendor Billing", "Generate and Reconcile Invoice", "Create invoice", invoice.status === "NotReconciled" ? "PASS" : "FAIL", `Invoice ${invoice.ngInvoiceNumber} status ${invoice.status}`);

  const available = assertData<any[]>(await request(`/invoices/${invoice.id}/available-slips`, {}, sessions.billing.token), "available slips");
  add("Vendor Billing", "Generate and Reconcile Invoice", "Confirmed slip appears for reconciliation", available.some((s) => s.id === confirmed.id) ? "PASS" : "FAIL", `${available.length} available slip(s)`);

  const reconciled = assertData<any>(
    await request(`/invoices/${invoice.id}/reconcile`, { method: "POST", body: JSON.stringify({ slipIds: [confirmed.id] }) }, sessions.billing.token),
    "reconcile invoice"
  );
  add("Vendor Billing", "Generate and Reconcile Invoice", "Billing can reconcile matching slip total", reconciled.status === "Reconciled" ? "PASS" : "FAIL", `Invoice status ${reconciled.status}`);

  const ngReconcile = await request(`/invoices/${invoice.id}/reconcile`, { method: "POST", body: JSON.stringify({ slipIds: [confirmed.id] }) }, sessions.ngDetail.token);
  add("NG Detail Admin", "Move Partially Reconciled Records to Paid", "NG Detail Admin cannot reconcile", ngReconcile.status === 403 ? "PASS" : "FAIL", `HTTP ${ngReconcile.status}`);

  const paid = assertData<any>(await request(`/invoices/${invoice.id}/mark-paid`, { method: "PATCH", body: JSON.stringify({}) }, sessions.ngDetail.token), "mark paid");
  add("NG Detail Admin", "Move Partially Reconciled Records to Paid", "Mark reconciled invoice paid", paid.status === "Paid" ? "PASS" : "FAIL", `Invoice status ${paid.status}`);

  const partialSlip = await confirmSlip(sessions.arborist, (await createBillable(sessions.gf, arboristId, `${unique}P`, 4)).id);
  const partialInvoice = assertData<any>(
    await request(
      "/invoices",
      {
        method: "POST",
        body: JSON.stringify({
          contractCompanyId: "00000000-0000-0000-0000-000000000002",
          ngInvoiceNumber: `NG-QA-PART-${unique}`,
          vendorInvoiceNumber: `V-QA-PART-${unique}`,
          totalHours: "08:00",
          invoiceAmount: 800,
          invoiceDate: isoDate()
        })
      },
      sessions.billing.token
    ),
    "create partial invoice"
  );
  const partialReconciled = assertData<any>(
    await request(`/invoices/${partialInvoice.id}/reconcile`, { method: "POST", body: JSON.stringify({ slipIds: [partialSlip.id] }) }, sessions.billing.token),
    "partial reconcile"
  );
  add("Vendor Billing", "Generate and Reconcile Invoice", "Exception handling creates partially reconciled invoice", partialReconciled.status === "PartiallyReconciled" ? "PASS" : "FAIL", `Invoice status ${partialReconciled.status}`);

  const partialPaid = await request(`/invoices/${partialInvoice.id}/mark-paid`, { method: "PATCH", body: JSON.stringify({}) }, sessions.ngDetail.token);
  const partialPaidData = partialPaid.ok ? (partialPaid.body as any).data : null;
  add("NG Detail Admin", "Move Partially Reconciled Records to Paid", "Move partially reconciled invoice to paid", partialPaid.ok && partialPaidData?.status === "Paid" ? "PASS" : "FAIL", `HTTP ${partialPaid.status}${partialPaidData?.status ? `, invoice status ${partialPaidData.status}` : ""}`);

  const audit = assertData<any[]>(await request(`/invoices/${invoice.id}/audit`, {}, sessions.ngDetail.token), "invoice audit");
  add("NG Detail Admin", "Move Partially Reconciled Records to Paid", "Invoice audit trail is visible", audit.length > 0 ? "PASS" : "FAIL", `${audit.length} audit event(s)`);

  const users = assertData<any[]>(await request("/users", {}, sessions.vendorAdmin.token), "vendor users");
  add("Vendor Super Admin", "Admin", "Vendor admin can manage scoped users", users.length > 0 ? "PASS" : "FAIL", `${users.length} user(s) visible`);

  const roles = assertData<any[]>(await request("/roles", {}, sessions.ngSuper.token), "roles");
  const logs = assertData<any[]>(await request("/audit-logs", {}, sessions.ngSuper.token), "audit logs");
  add("NG Super Admin", "Admin", "NG super admin can read roles and audit logs", roles.length > 0 && logs.length > 0 ? "PASS" : "FAIL", `${roles.length} roles, ${logs.length} audit log(s)`);

  const grouped = checks.reduce<Record<CheckStatus, number>>((acc, check) => {
    acc[check.status] = (acc[check.status] || 0) + 1;
    return acc;
  }, { PASS: 0, FAIL: 0, GAP: 0, WARN: 0 });

  const lines = [
    "# User Story Workflow QA Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Backend: ${baseUrl}`,
    `Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`,
    "",
    "## Summary",
    "",
    `- PASS: ${grouped.PASS || 0}`,
    `- FAIL: ${grouped.FAIL || 0}`,
    `- GAP: ${grouped.GAP || 0}`,
    `- WARN: ${grouped.WARN || 0}`,
    "",
    "## Results",
    "",
    "| Persona | Story | Check | Status | Details |",
    "|---|---|---|---|---|",
    ...checks.map((check) => `| ${check.persona} | ${check.story} | ${check.check} | ${check.status} | ${check.details.replace(/\|/g, "\\|")} |`),
    "",
    "## Notes",
    "",
    "- Seeded test password: `Test1234!`.",
    "- This test creates QA slips and invoices in the local database so audit trails and workflow transitions can be checked.",
    "- `GAP` means the system is stable but the implementation does not yet match the user story exactly.",
    "- `WARN` means the workflow works, but the implementation needs hardening before production use."
  ];

  await writeFile(join(process.cwd(), "USER_STORY_QA_REPORT.md"), `${lines.join("\n")}\n`);
  console.log("\nStory workflow QA report written to USER_STORY_QA_REPORT.md");

  if ((grouped.FAIL || 0) > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
