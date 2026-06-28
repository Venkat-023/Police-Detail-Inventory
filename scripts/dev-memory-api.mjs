import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const ok = (res, data, meta) => res.json({ success: true, data, ...(meta ? { meta } : {}) });
const fail = (res, status, code, message, fieldErrors = []) =>
  res.status(status).json({ success: false, error: { code, message, fieldErrors } });

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const orgs = [
  { id: "00000000-0000-0000-0000-000000000001", name: "National Grid", type: "Utility", createdBy: "seed", createdAt: new Date().toISOString() },
  { id: "00000000-0000-0000-0000-000000000002", name: "Avis", type: "Vendor", createdBy: "seed", createdAt: new Date().toISOString() },
  { id: "00000000-0000-0000-0000-000000000003", name: "Lewis Tree Service", type: "Vendor", createdBy: "seed", createdAt: new Date().toISOString() },
];

const roles = [
  { id: "role-vgf", name: "Vendor GF", type: "Vendor", appScope: "pdm", permissions: ["slips:read", "slips:create", "slips:update"] },
  { id: "role-vbill", name: "Vendor Billing", type: "Vendor", appScope: "pdm", permissions: ["invoices:read", "invoices:create", "invoices:update", "slips:read"] },
  { id: "role-vadmin", name: "Vendor Super Admin", type: "Vendor", appScope: "pdm", permissions: ["slips:*", "invoices:*", "users:*"] },
  { id: "role-arb", name: "NG Arborist", type: "Utility", appScope: "pdm", permissions: ["slips:read", "slips:update"] },
  { id: "role-fin", name: "NG Detail Admin", type: "Utility", appScope: "pdm", permissions: ["invoices:read", "invoices:reconcile", "slips:read"] },
  { id: "role-super", name: "NG Super Admin", type: "Utility", appScope: "pdm", permissions: ["*"] },
];

const users = [
  user("GF User", "gf@avis.com", "555-111-1234", "role-vgf", orgs[1].id),
  user("Billing User", "billing@avis.com", "555-222-1234", "role-vbill", orgs[1].id),
  user("Vendor Admin", "admin@avis.com", "555-333-1234", "role-vadmin", orgs[1].id),
  user("NG Arborist", "arborist@nationalgrid.com", "555-444-1234", "role-arb", orgs[0].id),
  user("NG Finance", "finance@nationalgrid.com", "555-555-1234", "role-fin", orgs[0].id),
  user("NG Super", "super@nationalgrid.com", "555-666-1234", "role-super", orgs[0].id),
];

const slips = [];
const invoices = [];
const audit = [];
const tokens = new Map();

function user(name, email, phone, roleId, organisationId) {
  return { id: randomUUID(), name, email, phone, roleId, organisationId, isActive: true, createdAt: new Date().toISOString() };
}

function includeUser(raw) {
  const role = roles.find((r) => r.id === raw.roleId);
  const organisation = orgs.find((o) => o.id === raw.organisationId);
  return { ...raw, role, organisation };
}

function current(req) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return tokens.get(token);
}

function requireAuth(req, res, next) {
  const actor = current(req);
  if (!actor) return fail(res, 401, "FORBIDDEN", "Authentication required.");
  req.user = actor;
  next();
}

function hasPermission(actor, permission) {
  const permissions = actor.role.permissions;
  const prefix = permission.split(":")[0];
  return permissions.includes("*") || permissions.includes(permission) || permissions.includes(`${prefix}:*`);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) return fail(res, 403, "FORBIDDEN", "You do not have permission to perform this action.");
    next();
  };
}

function shapeSlip(slip) {
  const arborist = users.find((u) => u.id === slip.arboristId);
  const vendor = orgs.find((o) => o.id === slip.vendorCompanyId);
  const creator = users.find((u) => u.id === slip.createdById);
  return {
    ...slip,
    slipNumber: `PDM-${String(slips.indexOf(slip) + 1).padStart(5, "0")}`,
    organisationId: slip.vendorCompanyId,
    vendorCompany: vendor?.name || "",
    arboristName: arborist?.name || "",
    createdByName: creator?.name || "",
  };
}

function shapeInvoice(invoice) {
  const vendor = orgs.find((o) => o.id === invoice.contractCompanyId);
  return {
    ...invoice,
    organisationId: invoice.contractCompanyId,
    vendorCompany: vendor?.name || "",
    attachedSlipIds: slips.filter((s) => s.invoiceId === invoice.id).map((s) => s.id),
  };
}

function addAudit(actor, entityType, entityId, action, fromState, toState, meta = {}) {
  audit.unshift({
    id: randomUUID(),
    entityType,
    entityId,
    actorId: actor.id,
    action,
    fromState,
    toState,
    metadata: { actorName: actor.name, actorRole: actor.role.name, ...meta },
    timestamp: new Date().toISOString(),
  });
}

function parseHHMM(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function invoiceStatus(invoice, attached) {
  if (!attached.length) return "NotReconciled";
  const invoiceMinutes = parseHHMM(invoice.totalHours);
  const slipMinutes = attached.reduce((sum, slip) => sum + Math.round(Number(slip.hoursToBeBilled) * 60), 0);
  return invoiceMinutes === slipMinutes ? "Reconciled" : "PartiallyReconciled";
}

app.get("/health", (_req, res) => ok(res, { status: "ok", service: "pdm-dev-memory-api" }));

const api = express.Router();

api.post("/auth/login", (req, res) => {
  const found = users.find((u) => u.email.toLowerCase() === String(req.body.email || "").toLowerCase() && u.isActive);
  if (!found || req.body.password !== "Test1234!") return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
  const accessToken = randomUUID();
  const fullUser = includeUser(found);
  tokens.set(accessToken, fullUser);
  res.cookie("refreshToken", randomUUID(), { httpOnly: true, sameSite: "strict" });
  ok(res, { accessToken, user: fullUser });
});

api.post("/auth/logout", (_req, res) => ok(res, { loggedOut: true }));
api.use(requireAuth);

api.get("/arborists", requirePermission("slips:read"), (_req, res) => {
  ok(res, users.filter((u) => roles.find((r) => r.id === u.roleId)?.name === "NG Arborist").map((u) => ({ id: u.id, name: u.name })));
});

api.get("/slips", requirePermission("slips:read"), (req, res) => {
  let list = slips;
  if (req.user.organisation.type === "Vendor") list = list.filter((s) => s.vendorCompanyId === req.user.organisationId);
  if (req.query.status) list = list.filter((s) => s.status === req.query.status);
  if (req.query.region) list = list.filter((s) => s.region?.toLowerCase().includes(String(req.query.region).toLowerCase()));
  if (req.query.arboristDistrict) list = list.filter((s) => s.arboristDistrict === req.query.arboristDistrict);
  if (req.query.dateFrom) list = list.filter((s) => s.detailDate >= req.query.dateFrom);
  if (req.query.dateTo) list = list.filter((s) => s.detailDate <= req.query.dateTo);
  ok(res, list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(shapeSlip), { total: list.length });
});

api.post("/slips", requirePermission("slips:create"), (req, res) => {
  const duplicate = slips.find((s) => s.officerName === req.body.officerName && s.detailDate === req.body.detailDate && s.timeFrom === req.body.timeFrom && s.timeTo === req.body.timeTo && !req.body.bypassDuplicateCheck);
  if (duplicate) return fail(res, 409, "CONFLICT", "Duplicate slip found.", [{ existingSlipId: duplicate.id }]);
  const now = new Date().toISOString();
  const slip = {
    id: randomUUID(),
    ...req.body,
    detailDate: String(req.body.detailDate).slice(0, 10),
    status: req.body.submitAsBillable ? "Billable" : "Draft",
    vendorCompanyId: req.user.organisationId,
    createdById: req.user.id,
    createdAt: now,
    updatedAt: now,
  };
  delete slip.submitAsBillable;
  delete slip.bypassDuplicateCheck;
  slips.unshift(slip);
  addAudit(req.user, "PoliceSlip", slip.id, "CREATE", null, slip.status);
  ok(res, shapeSlip(slip));
});

api.get("/slips/:id", requirePermission("slips:read"), (req, res) => {
  const slip = slips.find((s) => s.id === req.params.id);
  if (!slip) return fail(res, 404, "NOT_FOUND", "Slip not found.");
  ok(res, shapeSlip(slip));
});

api.put("/slips/:id", requirePermission("slips:update"), (req, res) => {
  const slip = slips.find((s) => s.id === req.params.id);
  if (!slip) return fail(res, 404, "NOT_FOUND", "Slip not found.");
  if (slip.status !== "Draft") return fail(res, 403, "FORBIDDEN", "Only Draft slips can be updated.");
  Object.assign(slip, req.body, { updatedAt: new Date().toISOString() });
  addAudit(req.user, "PoliceSlip", slip.id, "UPDATE");
  ok(res, shapeSlip(slip));
});

api.patch("/slips/:id/status", requirePermission("slips:update"), (req, res) => {
  const slip = slips.find((s) => s.id === req.params.id);
  if (!slip) return fail(res, 404, "NOT_FOUND", "Slip not found.");
  const from = slip.status;
  slip.status = req.body.status;
  slip.updatedAt = new Date().toISOString();
  addAudit(req.user, "PoliceSlip", slip.id, "STATUS_CHANGE", from, slip.status, req.body.reason ? { reason: req.body.reason } : {});
  ok(res, shapeSlip(slip));
});

api.get("/slips/:id/audit", requirePermission("slips:read"), (req, res) => ok(res, audit.filter((a) => a.entityType === "PoliceSlip" && a.entityId === req.params.id)));

api.get("/invoices", requirePermission("invoices:read"), (req, res) => {
  let list = invoices;
  if (req.user.organisation.type === "Vendor") list = list.filter((i) => i.contractCompanyId === req.user.organisationId);
  if (req.query.status) list = list.filter((i) => i.status === req.query.status);
  ok(res, list.map(shapeInvoice), { total: list.length });
});

api.post("/invoices", requirePermission("invoices:create"), (req, res) => {
  const invoice = {
    id: randomUUID(),
    ...req.body,
    contractCompanyId: req.user.organisation.type === "Vendor" ? req.user.organisationId : req.body.contractCompanyId,
    status: "NotReconciled",
    createdById: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  invoices.unshift(invoice);
  addAudit(req.user, "Invoice", invoice.id, "CREATE");
  ok(res, shapeInvoice(invoice));
});

api.get("/invoices/:id", requirePermission("invoices:read"), (req, res) => {
  const invoice = invoices.find((i) => i.id === req.params.id);
  if (!invoice) return fail(res, 404, "NOT_FOUND", "Invoice not found.");
  ok(res, { invoice: shapeInvoice(invoice), attachedSlips: slips.filter((s) => s.invoiceId === invoice.id).map(shapeSlip) });
});

api.get("/invoices/:id/available-slips", requirePermission("invoices:read"), (req, res) => {
  const invoice = invoices.find((i) => i.id === req.params.id);
  if (!invoice) return fail(res, 404, "NOT_FOUND", "Invoice not found.");
  ok(res, slips.filter((s) => s.status === "Confirmed" && !s.invoiceId && s.vendorCompanyId === invoice.contractCompanyId).map(shapeSlip));
});

api.post("/invoices/:id/reconcile", requirePermission("invoices:reconcile"), (req, res) => {
  const invoice = invoices.find((i) => i.id === req.params.id);
  if (!invoice) return fail(res, 404, "NOT_FOUND", "Invoice not found.");
  slips.forEach((s) => {
    if (s.invoiceId === invoice.id) delete s.invoiceId;
    if (req.body.slipIds.includes(s.id)) s.invoiceId = invoice.id;
  });
  const attached = slips.filter((s) => s.invoiceId === invoice.id);
  invoice.status = invoiceStatus(invoice, attached);
  invoice.updatedAt = new Date().toISOString();
  addAudit(req.user, "Invoice", invoice.id, "STATUS_CHANGE", null, invoice.status);
  ok(res, shapeInvoice(invoice));
});

api.patch("/invoices/:id/mark-paid", requirePermission("invoices:reconcile"), (req, res) => {
  const invoice = invoices.find((i) => i.id === req.params.id);
  if (!invoice) return fail(res, 404, "NOT_FOUND", "Invoice not found.");
  invoice.status = "Paid";
  invoice.paidAt = new Date().toISOString();
  invoice.paidById = req.user.id;
  ok(res, shapeInvoice(invoice));
});

api.get("/users", requirePermission("users:*"), (req, res) => ok(res, users.map(includeUser)));
api.post("/users", requirePermission("users:*"), (req, res) => {
  const created = user(req.body.name, req.body.email, req.body.phone, req.body.roleId, req.user.organisation.type === "Utility" ? req.body.organisationId : req.user.organisationId);
  users.push(created);
  ok(res, includeUser(created));
});
api.put("/users/:id", requirePermission("users:*"), (req, res) => {
  const found = users.find((u) => u.id === req.params.id);
  if (!found) return fail(res, 404, "NOT_FOUND", "User not found.");
  Object.assign(found, req.body);
  ok(res, includeUser(found));
});
api.patch("/users/:id/deactivate", requirePermission("users:*"), (req, res) => {
  const found = users.find((u) => u.id === req.params.id);
  if (found) found.isActive = false;
  ok(res, found);
});
api.patch("/users/:id/reactivate", requirePermission("users:*"), (req, res) => {
  const found = users.find((u) => u.id === req.params.id);
  if (found) found.isActive = true;
  ok(res, found);
});

api.get("/roles", requirePermission("*"), (_req, res) => ok(res, roles.map((role) => ({ ...role, _count: { users: users.filter((u) => u.roleId === role.id).length } }))));
api.post("/roles", requirePermission("*"), (req, res) => {
  const role = { id: randomUUID(), appScope: "pdm", ...req.body };
  roles.push(role);
  ok(res, role);
});
api.put("/roles/:id", requirePermission("*"), (req, res) => {
  const role = roles.find((r) => r.id === req.params.id);
  if (!role) return fail(res, 404, "NOT_FOUND", "Role not found.");
  Object.assign(role, req.body);
  ok(res, role);
});

api.get("/organisations", requirePermission("*"), (_req, res) => ok(res, orgs));
api.get("/audit-logs", requirePermission("*"), (_req, res) => ok(res, audit));

app.use("/api/v1", api);

app.listen(PORT, () => {
  console.log(`PDM dev memory API listening on http://localhost:${PORT}`);
});
