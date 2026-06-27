import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { z, ZodError } from "zod";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 3001);
const accessSecret = process.env.JWT_SECRET || "dev-access-secret-change-me-32-chars";
const refreshDays = 7;

type AuthUser = {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  orgId: string;
  orgType: "Vendor" | "Utility";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const stringCleaner = (value: unknown): unknown => {
  if (typeof value === "string") return value.replace(/<[^>]*>?/gm, "").trim();
  if (Array.isArray(value)) return value.map(stringCleaner);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stringCleaner(v)]));
  }
  return value;
};

const ok = (res: Response, data: unknown, meta?: unknown) => res.json({ success: true, data, ...(meta ? { meta } : {}) });
const fail = (res: Response, status: number, code: string, message: string, fieldErrors: unknown[] = []) =>
  res.status(status).json({ success: false, error: { code, message, fieldErrors } });

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors: unknown[] = []) {
    super(message);
  }
}

const asyncRoute = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);

const phoneValidator = z.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, "Invalid phone number format");
const hhmmValidator = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be HH:MM");

const createSlipSchema = z.object({
  region: z.string().min(1).max(100),
  arboristDistrict: z.string().min(1),
  arboristId: z.string().uuid(),
  workType: z.enum(["HTMP", "Trimming"]),
  budgetCode: z.string().min(1).max(50),
  circuitId: z.string().min(1).max(50),
  worksiteCountry: z.literal("US"),
  worksiteAddress: z.string().min(5).max(250),
  worksiteLatitude: z.number().min(18).max(72).optional(),
  worksiteLongitude: z.number().min(-180).max(-60).optional(),
  crewForeman: z.string().min(1).max(100),
  crewForemanPhone: phoneValidator,
  detailDate: z.string().refine((d) => new Date(d) <= new Date(), "Date cannot be in the future"),
  detailType: z.literal("Hourly"),
  timeFrom: hhmmValidator,
  timeTo: hhmmValidator,
  hoursWorked: z.number().min(0.25).max(24),
  officerName: z.string().min(1).max(100),
  officerEmail: z.string().email(),
  officerPhone: phoneValidator,
  officerRank: z.enum(["Officer", "Sergeant", "Lieutenant", "Captain", "Detective"]),
  cruiserNumber: z.string().min(1).max(20),
  billingDepartment: z.string().min(1).max(100),
  hoursToBeBilled: z.number().min(0).max(24),
  officerBadgeNumber: z.string().max(50).optional(),
  identityVerificationType: z.enum(["PoliceBadge", "GovernmentId"]).optional(),
  identityVerificationStatus: z.enum(["Pending", "Verified", "Failed"]).default("Pending"),
  officerIdDocumentUrl: z.string().optional(),
  policeHoursPhotoUrl: z.string().optional(),
  policeHoursPhotoLatitude: z.number().min(18).max(72).optional(),
  policeHoursPhotoLongitude: z.number().min(-180).max(-60).optional(),
  policeHoursPhotoTakenAt: z.string().datetime().optional(),
  entryPhotoUrl: z.string().optional(),
  entryPhotoLatitude: z.number().min(18).max(72).optional(),
  entryPhotoLongitude: z.number().min(-180).max(-60).optional(),
  entryPhotoTakenAt: z.string().datetime().optional(),
  exitPhotoUrl: z.string().optional(),
  exitPhotoLatitude: z.number().min(18).max(72).optional(),
  exitPhotoLongitude: z.number().min(-180).max(-60).optional(),
  exitPhotoTakenAt: z.string().datetime().optional(),
  locationVerified: z.boolean().default(false),
  timestampVerified: z.boolean().default(false),
  officerSignatureUrl: z.string().optional(),
  submitAsBillable: z.boolean().default(false),
  bypassDuplicateCheck: z.boolean().default(false)
});

const updateSlipSchema = createSlipSchema.omit({ submitAsBillable: true, bypassDuplicateCheck: true }).partial();
const createDraftSlipSchema = createSlipSchema.partial().extend({
  submitAsBillable: z.literal(false).default(false),
  bypassDuplicateCheck: z.boolean().default(false)
});
const createInvoiceSchema = z.object({
  contractCompanyId: z.string().uuid(),
  ngInvoiceNumber: z.string().min(1).max(50),
  vendorInvoiceNumber: z.string().max(50).optional(),
  totalHours: z.string().regex(/^\d{1,4}:[0-5][0-9]$/, "Hours must be HH:MM"),
  invoiceAmount: z.number().min(0.01).max(9999999.99),
  invoiceDate: z.string().refine((d) => !Number.isNaN(Date.parse(d)), "Invalid date")
});
const updateInvoiceSchema = createInvoiceSchema.partial();
const uploadSchema = z.object({ filename: z.string().min(1), contentType: z.string().min(1) });

function parseHHMMtoMinutes(hhMM: string): number {
  const [hours, minutes] = hhMM.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToHHMM(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60).toString().padStart(2, "0");
  const m = (absMinutes % 60).toString().padStart(2, "0");
  return `${minutes < 0 ? "-" : ""}${h}:${m}`;
}

function calculateReconciliation(invoiceTotalHours: string, slips: Array<{ hoursToBeBilled: unknown }>) {
  const invoiceMinutes = parseHHMMtoMinutes(invoiceTotalHours);
  const reconciledMinutes = slips.reduce((sum, slip) => sum + Math.round(Number(slip.hoursToBeBilled) * 60), 0);
  const differenceMinutes = invoiceMinutes - reconciledMinutes;
  const status = slips.length === 0 ? "NotReconciled" : differenceMinutes === 0 ? "Reconciled" : "PartiallyReconciled";
  return { differenceHHMM: formatMinutesToHHMM(differenceMinutes), status };
}

function hasPermission(user: AuthUser, required: string) {
  const prefix = required.split(":")[0];
  return user.permissions.includes("*") || user.permissions.includes(required) || user.permissions.includes(`${prefix}:*`);
}

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new ApiError(401, "FORBIDDEN", "Authentication required.");
  return req.user;
}

async function audit(actorId: string, entityType: string, entityId: string, action: string, req: Request, fromState?: string | null, toState?: string | null, metadata: Record<string, unknown> = {}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      entityType,
      entityId,
      action,
      fromState,
      toState,
      metadata: { ip: req.ip, userAgent: req.get("user-agent") || "", ...metadata }
    }
  });
}

function signAccessToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, roleId: user.roleId, roleName: user.roleName, permissions: user.permissions, orgId: user.orgId, orgType: user.orgType },
    accessSecret,
    { algorithm: "HS256", expiresIn: (process.env.JWT_ACCESS_EXPIRY || "15m") as any }
  );
}

async function userPayload(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    include: { role: true, organisation: true }
  });
  if (!user) throw new ApiError(401, "FORBIDDEN", "Authentication required.");
  return {
    id: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions,
    orgId: user.organisationId,
    orgType: user.organisation.type
  };
}

async function authenticateJWT(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw new ApiError(401, "FORBIDDEN", "Authentication required.");
    const payload = jwt.verify(token, accessSecret) as jwt.JwtPayload;
    req.user = await userPayload(String(payload.sub));
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "FORBIDDEN", "Authentication required."));
  }
}

const checkPermission = (required: string) => (req: Request, _res: Response, next: NextFunction) => {
  const user = requireUser(req);
  if (!hasPermission(user, required)) return next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action."));
  return next();
};

function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !req.path.startsWith("/auth/") && req.get("x-pdm-request") !== "true") {
    return next(new ApiError(403, "FORBIDDEN", "X-PDM-Request header is required."));
  }
  return next();
}

function vendorSlipWhere(req: Request, where: any = {}) {
  const user = requireUser(req);
  if (user.orgType === "Vendor") return { ...where, vendorCompanyId: user.orgId };
  return where;
}

function vendorInvoiceWhere(req: Request, where: any = {}) {
  const user = requireUser(req);
  if (user.orgType === "Vendor") return { ...where, contractCompanyId: user.orgId };
  return where;
}

function ensureNoDetailAdminSlipWrite(req: Request) {
  if (req.user?.roleName === "NG Detail Admin" && ["POST", "PUT", "PATCH"].includes(req.method)) {
    throw new ApiError(403, "FORBIDDEN", "NG Detail Admin may not modify slips.");
  }
}

function billableGuard(data: Record<string, unknown>) {
  const missing: string[] = [];
  if (!data.officerBadgeNumber) missing.push("officerBadgeNumber");
  if (!data.officerIdDocumentUrl) missing.push("officerIdDocumentUrl");
  if (!data.entryPhotoUrl) missing.push("entryPhotoUrl");
  if (!data.exitPhotoUrl) missing.push("exitPhotoUrl");
  if (data.entryPhotoLatitude == null) missing.push("entryPhotoLatitude");
  if (data.entryPhotoLongitude == null) missing.push("entryPhotoLongitude");
  if (!data.entryPhotoTakenAt) missing.push("entryPhotoTakenAt");
  if (data.exitPhotoLatitude == null) missing.push("exitPhotoLatitude");
  if (data.exitPhotoLongitude == null) missing.push("exitPhotoLongitude");
  if (!data.exitPhotoTakenAt) missing.push("exitPhotoTakenAt");
  if (data.worksiteLatitude == null) missing.push("worksiteLatitude");
  if (data.worksiteLongitude == null) missing.push("worksiteLongitude");
  if (data.locationVerified !== true) missing.push("locationVerified");
  if (data.timestampVerified !== true) missing.push("timestampVerified");
  if (data.identityVerificationStatus !== "Verified") missing.push("identityVerificationStatus");
  if (Number(data.hoursToBeBilled) <= 0) missing.push("hoursToBeBilled");
  if (missing.length) throw new ApiError(422, "VALIDATION_ERROR", "Billable guard failed.", missing.map((field) => ({ field, message: "Required for Billable status" })));
}

async function draftDefaults(user: AuthUser) {
  const arborist = await prisma.user.findFirst({ where: { role: { name: "NG Arborist" }, isActive: true }, select: { id: true } });
  if (!arborist) throw new ApiError(500, "CONFIGURATION_ERROR", "No active NG Arborist exists for draft defaults.");
  return {
    region: "Draft",
    arboristDistrict: "Draft",
    arboristId: arborist.id,
    workType: "HTMP" as const,
    budgetCode: "Draft",
    circuitId: "Draft",
    worksiteCountry: "US" as const,
    worksiteAddress: "Draft worksite",
    crewForeman: "Draft",
    crewForemanPhone: "555-000-0000",
    detailDate: new Date().toISOString().slice(0, 10),
    detailType: "Hourly" as const,
    timeFrom: "08:00",
    timeTo: "08:15",
    hoursWorked: 0.25,
    officerName: `Draft Officer ${user.id.slice(0, 8)}`,
    officerEmail: `draft-${randomUUID()}@example.com`,
    officerPhone: "555-000-0000",
    officerRank: "Officer" as const,
    cruiserNumber: "Draft",
    billingDepartment: "Draft",
    hoursToBeBilled: 0
  };
}

function cleanDraftInput(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== null && !(typeof value === "number" && Number.isNaN(value))));
}

function hasDraftContent(input: Record<string, unknown>) {
  return Object.entries(cleanDraftInput(input)).some(([key, value]) => !["submitAsBillable", "bypassDuplicateCheck"].includes(key) && value !== false);
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const radius = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assessSlipVerification(data: Record<string, unknown>) {
  const flags: Array<{ code: string; severity: "low" | "medium" | "high"; message: string }> = [];
  const workLat = Number(data.worksiteLatitude);
  const workLng = Number(data.worksiteLongitude);
  const entryLat = Number(data.entryPhotoLatitude);
  const entryLng = Number(data.entryPhotoLongitude);
  const exitLat = Number(data.exitPhotoLatitude);
  const exitLng = Number(data.exitPhotoLongitude);
  const hasLocation = [workLat, workLng, entryLat, entryLng, exitLat, exitLng].every(Number.isFinite);
  const entryAt = data.entryPhotoTakenAt ? new Date(String(data.entryPhotoTakenAt)) : null;
  const exitAt = data.exitPhotoTakenAt ? new Date(String(data.exitPhotoTakenAt)) : null;
  const detailDate = data.detailDate ? new Date(String(data.detailDate)).toISOString().slice(0, 10) : "";

  let locationVerified = false;
  let timestampVerified = false;
  if (hasLocation) {
    const entryDistance = distanceMeters(workLat, workLng, entryLat, entryLng);
    const exitDistance = distanceMeters(workLat, workLng, exitLat, exitLng);
    locationVerified = entryDistance <= 500 && exitDistance <= 500;
    if (!locationVerified) {
      flags.push({ code: "GEO_DISTANCE", severity: "high", message: `Entry/exit photos must be within 500m of the worksite. Entry ${Math.round(entryDistance)}m, exit ${Math.round(exitDistance)}m.` });
    }
  }
  if (entryAt && exitAt && !Number.isNaN(entryAt.getTime()) && !Number.isNaN(exitAt.getTime())) {
    timestampVerified = entryAt <= exitAt && entryAt.toISOString().slice(0, 10) === detailDate && exitAt.toISOString().slice(0, 10) === detailDate;
    if (!timestampVerified) flags.push({ code: "PHOTO_TIME", severity: "high", message: "Entry and exit photo timestamps must be in order and match the detail date." });
  }
  if (Number(data.hoursToBeBilled) > Number(data.hoursWorked)) {
    flags.push({ code: "BILLED_GT_WORKED", severity: "medium", message: "Hours to be billed exceed hours worked." });
  }
  if (Number(data.hoursWorked) >= 16) {
    flags.push({ code: "LONG_SHIFT", severity: "medium", message: "Shift is unusually long." });
  }
  return { locationVerified, timestampVerified, flags };
}

async function signKey(key?: string | null) {
  if (!key) return key;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) return key;
  const client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
  return getSignedUrl(client, new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key }), { expiresIn: Number(process.env.S3_SIGNED_URL_EXPIRY || 3600) });
}

async function uploadUrl(folder: string, ext: string, contentType: string) {
  if ((folder === "signatures" && contentType !== "image/png") || (folder === "verification" && contentType !== "image/jpeg")) {
    throw new ApiError(422, "VALIDATION_ERROR", "Invalid content type.");
  }
  const fileKey = `${folder}/${randomUUID()}${ext}`;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
    return { uploadUrl: `local-s3-disabled://${fileKey}`, fileKey };
  }
  const client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: fileKey, ContentType: contentType }), { expiresIn: Number(process.env.S3_SIGNED_URL_EXPIRY || 3600) });
  return { uploadUrl, fileKey };
}

const slipInclude = {
  arborist: { select: { id: true, name: true } },
  vendorCompany: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } }
};

const invoiceInclude = {
  contractCompany: { select: { id: true, name: true } },
  slips: { select: { id: true } }
};

function dateOnly(value?: Date | string | null) {
  if (!value) return value;
  return new Date(value).toISOString().slice(0, 10);
}

function shapeSlip(slip: any) {
  return {
    ...slip,
    slipNumber: `PDM-${String(slip.id).slice(0, 8).toUpperCase()}`,
    detailDate: dateOnly(slip.detailDate),
    createdAt: slip.createdAt?.toISOString?.() || slip.createdAt,
    updatedAt: slip.updatedAt?.toISOString?.() || slip.updatedAt,
    policeHoursPhotoTakenAt: slip.policeHoursPhotoTakenAt?.toISOString?.() || slip.policeHoursPhotoTakenAt,
    entryPhotoTakenAt: slip.entryPhotoTakenAt?.toISOString?.() || slip.entryPhotoTakenAt,
    exitPhotoTakenAt: slip.exitPhotoTakenAt?.toISOString?.() || slip.exitPhotoTakenAt,
    hoursWorked: Number(slip.hoursWorked),
    hoursToBeBilled: Number(slip.hoursToBeBilled),
    worksiteLatitude: slip.worksiteLatitude == null ? undefined : Number(slip.worksiteLatitude),
    worksiteLongitude: slip.worksiteLongitude == null ? undefined : Number(slip.worksiteLongitude),
    policeHoursPhotoLatitude: slip.policeHoursPhotoLatitude == null ? undefined : Number(slip.policeHoursPhotoLatitude),
    policeHoursPhotoLongitude: slip.policeHoursPhotoLongitude == null ? undefined : Number(slip.policeHoursPhotoLongitude),
    entryPhotoLatitude: slip.entryPhotoLatitude == null ? undefined : Number(slip.entryPhotoLatitude),
    entryPhotoLongitude: slip.entryPhotoLongitude == null ? undefined : Number(slip.entryPhotoLongitude),
    exitPhotoLatitude: slip.exitPhotoLatitude == null ? undefined : Number(slip.exitPhotoLatitude),
    exitPhotoLongitude: slip.exitPhotoLongitude == null ? undefined : Number(slip.exitPhotoLongitude),
    organisationId: slip.vendorCompanyId,
    vendorCompany: slip.vendorCompany?.name || slip.vendorCompanyId,
    arboristName: slip.arborist?.name || slip.arboristId,
    createdByName: slip.createdBy?.name || slip.createdById,
    invoiceId: slip.invoiceId || undefined
  };
}

function shapeInvoice(invoice: any) {
  return {
    ...invoice,
    invoiceDate: dateOnly(invoice.invoiceDate),
    createdAt: invoice.createdAt?.toISOString?.() || invoice.createdAt,
    updatedAt: invoice.updatedAt?.toISOString?.() || invoice.updatedAt,
    paidAt: invoice.paidAt?.toISOString?.() || invoice.paidAt,
    invoiceAmount: Number(invoice.invoiceAmount),
    organisationId: invoice.contractCompanyId,
    vendorCompany: invoice.contractCompany?.name || invoice.contractCompanyId,
    attachedSlipIds: invoice.slips?.map((slip: any) => slip.id) || []
  };
}

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use((req, _res, next) => {
  req.body = stringCleaner(req.body);
  next();
});

const globalLimiter = rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000), max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100), standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900000), max: Number(process.env.AUTH_RATE_LIMIT_MAX || (process.env.NODE_ENV === "development" ? 100 : 5)), standardHeaders: true, legacyHeaders: false });

app.get("/health", (_req, res) => ok(res, { status: "ok", service: "pdm-backend" }));

const api = express.Router();
api.use(globalLimiter);
api.use(requireCsrf);

api.post("/auth/login", authLimiter, asyncRoute(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true, organisation: true } });
  const invalid = async () => {
    await audit(user?.id || "system", "Auth", user?.id || "unknown", "LOGIN_FAILED", req);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  };
  if (!user || !user.isActive) return invalid();
  if (!(await bcrypt.compare(password, user.passwordHash))) await invalid();
  const payload = await userPayload(user.id);
  const refreshToken = randomUUID();
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000) } });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: refreshDays * 24 * 60 * 60 * 1000 });
  return ok(res, {
    accessToken: signAccessToken(payload),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: { id: user.role.id, name: user.role.name, permissions: user.role.permissions },
      organisation: { id: user.organisation.id, name: user.organisation.name, type: user.organisation.type }
    }
  });
}));

api.post("/auth/refresh", authLimiter, asyncRoute(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new ApiError(401, "FORBIDDEN", "Refresh token required.");
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) throw new ApiError(401, "FORBIDDEN", "Refresh token invalid.");
  const nextToken = randomUUID();
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token } }),
    prisma.refreshToken.create({ data: { token: nextToken, userId: stored.userId, expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000) } })
  ]);
  res.cookie("refreshToken", nextToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: refreshDays * 24 * 60 * 60 * 1000 });
  return ok(res, { accessToken: signAccessToken(await userPayload(stored.userId)) });
}));

api.post("/auth/logout", asyncRoute(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) await prisma.refreshToken.updateMany({ where: { token }, data: { revokedAt: new Date() } });
  res.clearCookie("refreshToken");
  return ok(res, { loggedOut: true });
}));

api.use(authenticateJWT);

api.get("/arborists", checkPermission("slips:read"), asyncRoute(async (_req, res) => {
  const arborists = await prisma.user.findMany({
    where: { isActive: true, role: { name: "NG Arborist" } },
    select: { id: true, name: true }
  });
  return ok(res, arborists);
}));

api.get("/slips/available", checkPermission("slips:read"), asyncRoute(async (req, res) => {
  const slips = await prisma.policeSlip.findMany({ where: vendorSlipWhere(req, { status: "Confirmed", invoiceId: null }), include: slipInclude, orderBy: { detailDate: "desc" }, take: 100 });
  return ok(res, slips.map(shapeSlip));
}));

api.post("/slips/signature-upload-url", checkPermission("slips:create"), asyncRoute(async (req, res) => ok(res, await uploadUrl("signatures", ".png", uploadSchema.parse(req.body).contentType))));
api.post("/slips/verification-photo-upload-url", checkPermission("slips:create"), asyncRoute(async (req, res) => ok(res, await uploadUrl("verification", ".jpg", uploadSchema.parse(req.body).contentType))));
api.post("/slips/identity-upload-url", checkPermission("slips:create"), asyncRoute(async (req, res) => {
  const body = uploadSchema.parse(req.body);
  const ext = body.filename.includes(".") ? `.${body.filename.split(".").pop()}` : "";
  return ok(res, await uploadUrl("identity", ext, body.contentType));
}));

api.get("/slips", checkPermission("slips:read"), asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage || 20)));
  const where: any = {};
  for (const key of ["status", "region", "arboristDistrict", "arboristId"] as const) if (req.query[key]) (where as any)[key] = req.query[key];
  if (req.query.vendorCompanyId && req.user?.orgType === "Utility") where.vendorCompanyId = String(req.query.vendorCompanyId);
  if (req.query.dateFrom || req.query.dateTo) where.detailDate = { gte: req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined, lte: req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined };
  if (req.user?.roleName === "NG Arborist") where.status = { in: ["Billable", "Confirmed", "ReturnedForRevision", "NonBillable"] };
  const scoped = vendorSlipWhere(req, where);
  const total = await prisma.policeSlip.count({ where: scoped });
  const data = await prisma.policeSlip.findMany({ where: scoped, include: slipInclude, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: "desc" } });
  return ok(res, data.map(shapeSlip), { page, perPage, total, totalPages: Math.ceil(total / perPage) });
}));

api.post("/slips", checkPermission("slips:create"), asyncRoute(async (req, res) => {
  ensureNoDetailAdminSlipWrite(req);
  const user = requireUser(req);
  if (user.orgType !== "Vendor") throw new ApiError(403, "FORBIDDEN", "Only vendor users can create slips.");
  const draftMode = req.body?.submitAsBillable !== true;
  if (draftMode && !hasDraftContent(req.body || {})) throw new ApiError(422, "VALIDATION_ERROR", "At least one slip field is required to save a draft.");
  const parsed = draftMode
    ? createSlipSchema.parse({ ...(await draftDefaults(user)), ...createDraftSlipSchema.parse(cleanDraftInput(req.body || {})), submitAsBillable: false })
    : createSlipSchema.parse(req.body);
  const assessment = assessSlipVerification(parsed);
  const body = { ...parsed, locationVerified: assessment.locationVerified, timestampVerified: assessment.timestampVerified };
  if (body.submitAsBillable) billableGuard(body);
  if (body.submitAsBillable && !body.bypassDuplicateCheck) {
    const duplicate = await prisma.policeSlip.findFirst({ where: { officerName: body.officerName, detailDate: new Date(body.detailDate), vendorCompanyId: user.orgId, timeFrom: body.timeFrom, timeTo: body.timeTo, status: { not: "NonBillable" } } });
    if (duplicate) throw new ApiError(409, "CONFLICT", "Duplicate slip found.", [{ existingSlipId: duplicate.id }]);
  }
  const { submitAsBillable, bypassDuplicateCheck, ...data } = body;
  const slip = await prisma.policeSlip.create({ data: { ...data, status: submitAsBillable ? "Billable" : "Draft", vendorCompanyId: user.orgId, createdById: user.id, detailDate: new Date(data.detailDate), policeHoursPhotoTakenAt: data.policeHoursPhotoTakenAt ? new Date(data.policeHoursPhotoTakenAt) : undefined, entryPhotoTakenAt: data.entryPhotoTakenAt ? new Date(data.entryPhotoTakenAt) : undefined, exitPhotoTakenAt: data.exitPhotoTakenAt ? new Date(data.exitPhotoTakenAt) : undefined }, include: slipInclude });
  await audit(user.id, "PoliceSlip", slip.id, "CREATE", req, null, slip.status, { verificationFlags: assessment.flags });
  return ok(res, shapeSlip(slip));
}));

api.get("/slips/:id", checkPermission("slips:read"), asyncRoute(async (req, res) => {
  const slip = await prisma.policeSlip.findFirst({ where: vendorSlipWhere(req, { id: req.params.id }), include: slipInclude });
  if (!slip) throw new ApiError(404, "NOT_FOUND", "Slip not found.");
  return ok(res, shapeSlip({ ...slip, officerSignatureUrl: await signKey(slip.officerSignatureUrl), policeHoursPhotoUrl: await signKey(slip.policeHoursPhotoUrl), officerIdDocumentUrl: await signKey(slip.officerIdDocumentUrl), entryPhotoUrl: await signKey(slip.entryPhotoUrl), exitPhotoUrl: await signKey(slip.exitPhotoUrl) }));
}));

api.put("/slips/:id", checkPermission("slips:update"), asyncRoute(async (req, res) => {
  ensureNoDetailAdminSlipWrite(req);
  const user = requireUser(req);
  const existing = await prisma.policeSlip.findFirst({ where: vendorSlipWhere(req, { id: req.params.id }) });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Slip not found.");
  if (!["Draft", "ReturnedForRevision"].includes(existing.status)) throw new ApiError(403, "FORBIDDEN", "Only Draft or Returned for Revision slips can be updated.");
  if (existing.createdById !== user.id && user.roleName !== "Vendor Super Admin") throw new ApiError(403, "FORBIDDEN", "Only the creator or Vendor Super Admin can update this slip.");
  const parsed = updateSlipSchema.parse(req.body);
  const assessment = assessSlipVerification({ ...existing, ...parsed });
  const body = { ...parsed, ...(Object.keys(parsed).some((key) => ["worksiteLatitude", "worksiteLongitude", "entryPhotoLatitude", "entryPhotoLongitude", "entryPhotoTakenAt", "exitPhotoLatitude", "exitPhotoLongitude", "exitPhotoTakenAt"].includes(key)) ? { locationVerified: assessment.locationVerified, timestampVerified: assessment.timestampVerified } : {}) };
  const changedFields = Object.keys(body).filter((key) => String((existing as any)[key]) !== String((body as any)[key]));
  const slip = await prisma.policeSlip.update({ where: { id: existing.id }, data: { ...body, detailDate: body.detailDate ? new Date(body.detailDate) : undefined, policeHoursPhotoTakenAt: body.policeHoursPhotoTakenAt ? new Date(body.policeHoursPhotoTakenAt) : undefined, entryPhotoTakenAt: body.entryPhotoTakenAt ? new Date(body.entryPhotoTakenAt) : undefined, exitPhotoTakenAt: body.exitPhotoTakenAt ? new Date(body.exitPhotoTakenAt) : undefined }, include: slipInclude });
  await audit(user.id, "PoliceSlip", slip.id, "UPDATE", req, null, null, { changedFields, verificationFlags: assessment.flags });
  return ok(res, shapeSlip(slip));
}));

api.patch("/slips/:id/status", checkPermission("slips:update"), asyncRoute(async (req, res) => {
  ensureNoDetailAdminSlipWrite(req);
  const user = requireUser(req);
  const { status, reason } = z.object({ status: z.enum(["Draft", "Billable", "Confirmed", "ReturnedForRevision", "NonBillable"]), reason: z.string().optional() }).parse(req.body);
  const slip = await prisma.policeSlip.findFirst({ where: user.orgType === "Vendor" ? { id: req.params.id, vendorCompanyId: user.orgId } : { id: req.params.id } });
  if (!slip) throw new ApiError(404, "NOT_FOUND", "Slip not found.");
  let allowed = false;
  if (["Draft", "ReturnedForRevision"].includes(slip.status) && ["Billable", "NonBillable"].includes(status) && user.orgType === "Vendor" && (slip.createdById === user.id || user.roleName === "Vendor Super Admin")) allowed = true;
  if (slip.status === "Billable" && ["Confirmed", "ReturnedForRevision", "NonBillable"].includes(status) && user.roleName === "NG Arborist") allowed = true;
  if (slip.status === "Billable" && ["ReturnedForRevision", "NonBillable"].includes(status) && user.roleName === "NG Arborist" && !reason) throw new ApiError(422, "VALIDATION_ERROR", "Reason is required.");
  let verificationUpdate = {};
  if (status === "Billable") {
    const assessment = assessSlipVerification(slip as unknown as Record<string, unknown>);
    const verifiedSlip = { ...(slip as unknown as Record<string, unknown>), locationVerified: assessment.locationVerified, timestampVerified: assessment.timestampVerified };
    billableGuard(verifiedSlip);
    verificationUpdate = { locationVerified: assessment.locationVerified, timestampVerified: assessment.timestampVerified };
  }
  if (!allowed || user.roleName === "Vendor Super Admin" && status === "Confirmed") throw new ApiError(403, "INVALID_TRANSITION", "Illegal slip status transition.");
  const updated = await prisma.policeSlip.update({ where: { id: slip.id }, data: { status, ...verificationUpdate }, include: slipInclude });
  await audit(user.id, "PoliceSlip", slip.id, "STATUS_CHANGE", req, slip.status, status, reason ? { reason } : {});
  return ok(res, shapeSlip(updated));
}));

api.get("/slips/:id/audit", checkPermission("slips:read"), asyncRoute(async (req, res) => ok(res, await prisma.auditLog.findMany({ where: { entityType: "PoliceSlip", entityId: req.params.id }, orderBy: { timestamp: "asc" } }))));

api.get("/invoices", checkPermission("invoices:read"), asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage || 20)));
  const where: any = {};
  if (req.query.status) where.status = String(req.query.status) as any;
  const scoped = vendorInvoiceWhere(req, where);
  const total = await prisma.invoice.count({ where: scoped });
  const data = await prisma.invoice.findMany({ where: scoped, include: invoiceInclude, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: "desc" } });
  return ok(res, data.map(shapeInvoice), { page, perPage, total, totalPages: Math.ceil(total / perPage) });
}));

api.post("/invoices", checkPermission("invoices:create"), asyncRoute(async (req, res) => {
  const user = requireUser(req);
  const body = createInvoiceSchema.parse(req.body);
  const data = { ...body, contractCompanyId: user.orgType === "Vendor" ? user.orgId : body.contractCompanyId, invoiceDate: new Date(body.invoiceDate), createdById: user.id, status: "NotReconciled" as const };
  const invoice = await prisma.invoice.create({ data, include: invoiceInclude });
  await audit(user.id, "Invoice", invoice.id, "CREATE", req);
  return ok(res, shapeInvoice(invoice));
}));

api.get("/invoices/:id", checkPermission("invoices:read"), asyncRoute(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: vendorInvoiceWhere(req, { id: req.params.id }), include: { contractCompany: { select: { id: true, name: true } }, slips: { include: slipInclude } } });
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  return ok(res, { invoice: shapeInvoice(invoice), attachedSlips: invoice.slips.map(shapeSlip) });
}));

api.put("/invoices/:id", checkPermission("invoices:update"), asyncRoute(async (req, res) => {
  const user = requireUser(req);
  const invoice = await prisma.invoice.findFirst({ where: vendorInvoiceWhere(req, { id: req.params.id }) });
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  if (invoice.status === "Paid") throw new ApiError(409, "CONFLICT", "Paid invoices cannot be updated.");
  const body = updateInvoiceSchema.parse(req.body);
  const changedFields = Object.keys(body).filter((key) => String((invoice as any)[key]) !== String((body as any)[key]));
  const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { ...body, contractCompanyId: user.orgType === "Vendor" ? invoice.contractCompanyId : body.contractCompanyId, invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined }, include: invoiceInclude });
  await audit(user.id, "Invoice", invoice.id, "UPDATE", req, null, null, { changedFields });
  return ok(res, shapeInvoice(updated));
}));

api.post("/invoices/:id/reconcile", checkPermission("invoices:reconcile"), asyncRoute(async (req, res) => {
  const user = requireUser(req);
  const { slipIds } = z.object({ slipIds: z.array(z.string().uuid()) }).parse(req.body);
  const result = await prisma.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.findFirst({ where: vendorInvoiceWhere(req, { id: req.params.id }) });
    if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
    const slips = await tx.policeSlip.findMany({ where: { id: { in: slipIds } } });
    if (slips.length !== slipIds.length) throw new ApiError(404, "NOT_FOUND", "One or more slips were not found.");
    for (const slip of slips) {
      if (slip.vendorCompanyId !== invoice.contractCompanyId) throw new ApiError(403, "FORBIDDEN", "Slip belongs to another organisation.");
      if (slip.status !== "Confirmed") throw new ApiError(403, "INVALID_TRANSITION", "Only Confirmed slips can be reconciled.");
      if (slip.invoiceId && slip.invoiceId !== invoice.id) throw new ApiError(409, "CONFLICT", "Slip is already attached to another invoice.");
    }
    await tx.policeSlip.updateMany({ where: { invoiceId: invoice.id }, data: { invoiceId: null } });
    await tx.policeSlip.updateMany({ where: { id: { in: slipIds } }, data: { invoiceId: invoice.id } });
    const calc = calculateReconciliation(invoice.totalHours, slips);
    return tx.invoice.update({ where: { id: invoice.id }, data: { status: calc.status as any }, include: invoiceInclude });
  });
  await audit(user.id, "Invoice", result.id, "STATUS_CHANGE", req, null, result.status);
  return ok(res, shapeInvoice(result));
}));

api.patch("/invoices/:id/mark-paid", checkPermission("invoices:pay"), asyncRoute(async (req, res) => {
  const user = requireUser(req);
  if (user.roleName !== "NG Detail Admin") throw new ApiError(403, "FORBIDDEN", "Only NG Detail Admin can mark paid.");
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  if (!["Reconciled", "PartiallyReconciled"].includes(invoice.status)) throw new ApiError(403, "FORBIDDEN", "Only Reconciled or Partially Reconciled invoices can be marked Paid.");
  const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "Paid", paidAt: new Date(), paidById: user.id }, include: invoiceInclude });
  await audit(user.id, "Invoice", invoice.id, "STATUS_CHANGE", req, invoice.status, "Paid");
  return ok(res, shapeInvoice(updated));
}));

api.get("/invoices/:id/available-slips", checkPermission("invoices:read"), asyncRoute(async (req, res) => {
  const invoice = await prisma.invoice.findFirst({ where: vendorInvoiceWhere(req, { id: req.params.id }) });
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  const slips = await prisma.policeSlip.findMany({ where: { status: "Confirmed", invoiceId: null, vendorCompanyId: invoice.contractCompanyId }, include: slipInclude });
  return ok(res, slips.map(shapeSlip));
}));

api.get("/invoices/:id/audit", checkPermission("invoices:read"), asyncRoute(async (req, res) => ok(res, await prisma.auditLog.findMany({ where: { entityType: "Invoice", entityId: req.params.id }, orderBy: { timestamp: "asc" } }))));

api.get("/users", checkPermission("users:*"), asyncRoute(async (req, res) => {
  const user = requireUser(req);
  const where = user.roleName === "NG Super Admin" ? {} : { organisationId: user.orgId };
  return ok(res, await prisma.user.findMany({ where, select: { id: true, name: true, email: true, phone: true, isActive: true, organisationId: true, roleId: true, createdAt: true, role: true, organisation: true } }));
}));

api.post("/users", checkPermission("users:*"), asyncRoute(async (req, res) => {
  const actor = requireUser(req);
  const body = z.object({ name: z.string().min(1), email: z.string().email(), phone: phoneValidator, organisationId: z.string().uuid().optional(), roleId: z.string().uuid(), password: z.string().min(8).optional() }).parse(req.body);
  const generatedPassword = body.password || randomUUID().replaceAll("-", "").slice(0, 16);
  const created = await prisma.user.create({ data: { name: body.name, email: body.email, phone: body.phone, roleId: body.roleId, organisationId: actor.roleName === "NG Super Admin" ? body.organisationId! : actor.orgId, passwordHash: await bcrypt.hash(generatedPassword, 12) }, select: { id: true, name: true, email: true, phone: true, isActive: true, organisationId: true, roleId: true } });
  await audit(actor.id, "User", created.id, "CREATE", req);
  return ok(res, { ...created, generatedPassword: body.password ? undefined : generatedPassword });
}));

api.get("/users/:id", checkPermission("users:*"), asyncRoute(async (req, res) => {
  const actor = requireUser(req);
  const user = await prisma.user.findFirst({ where: { id: req.params.id, ...(actor.roleName === "NG Super Admin" ? {} : { organisationId: actor.orgId }) }, select: { id: true, name: true, email: true, phone: true, isActive: true, organisationId: true, roleId: true, createdAt: true, role: true, organisation: true } });
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");
  return ok(res, user);
}));

api.put("/users/:id", checkPermission("users:*"), asyncRoute(async (req, res) => {
  const actor = requireUser(req);
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, ...(actor.roleName === "NG Super Admin" ? {} : { organisationId: actor.orgId }) } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "User not found.");
  const body = z.object({ name: z.string().min(1).optional(), phone: phoneValidator.optional(), roleId: z.string().uuid().optional() }).parse(req.body);
  const updated = await prisma.user.update({ where: { id: existing.id }, data: body, select: { id: true, name: true, email: true, phone: true, isActive: true, organisationId: true, roleId: true } });
  await audit(actor.id, "User", existing.id, "UPDATE", req, null, null, { changedFields: Object.keys(body) });
  return ok(res, updated);
}));

api.patch("/users/:id/deactivate", checkPermission("users:*"), asyncRoute(async (req, res) => {
  const actor = requireUser(req);
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false }, select: { id: true, isActive: true } });
  await audit(actor.id, "User", updated.id, "DEACTIVATE", req);
  return ok(res, updated);
}));
api.patch("/users/:id/reactivate", checkPermission("users:*"), asyncRoute(async (req, res) => ok(res, await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true }, select: { id: true, isActive: true } }))));

api.get("/roles", checkPermission("*"), asyncRoute(async (_req, res) => ok(res, await prisma.role.findMany({ include: { _count: { select: { users: true } } } }))));
api.post("/roles", checkPermission("*"), asyncRoute(async (req, res) => ok(res, await prisma.role.create({ data: z.object({ name: z.string().min(1), type: z.enum(["Vendor", "Utility"]), permissions: z.array(z.string()) }).parse(req.body) }))));
api.get("/roles/:id", checkPermission("*"), asyncRoute(async (req, res) => ok(res, await prisma.role.findUniqueOrThrow({ where: { id: req.params.id } }))));
api.put("/roles/:id", checkPermission("*"), asyncRoute(async (req, res) => ok(res, await prisma.role.update({ where: { id: req.params.id }, data: z.object({ name: z.string().min(1).optional(), type: z.enum(["Vendor", "Utility"]).optional(), permissions: z.array(z.string()).optional() }).parse(req.body) }))));
api.delete("/roles/:id", checkPermission("*"), asyncRoute(async (req, res) => {
  const role = await prisma.role.findUnique({ where: { id: req.params.id }, include: { _count: { select: { users: true } } } });
  if (!role) throw new ApiError(404, "NOT_FOUND", "Role not found.");
  if (role._count.users > 0) throw new ApiError(409, "CONFLICT", "Role has assigned users.");
  await prisma.role.delete({ where: { id: role.id } });
  return ok(res, { deleted: true });
}));

api.get("/organisations", checkPermission("*"), asyncRoute(async (_req, res) => ok(res, await prisma.organisation.findMany())));
api.post("/organisations", checkPermission("*"), asyncRoute(async (req, res) => {
  const actor = requireUser(req);
  const org = await prisma.organisation.create({ data: { ...z.object({ name: z.string().min(1), type: z.enum(["Vendor", "Utility"]) }).parse(req.body), createdBy: actor.id } });
  await audit(actor.id, "Organisation", org.id, "CREATE", req);
  return ok(res, org);
}));
api.get("/organisations/:id", checkPermission("*"), asyncRoute(async (req, res) => ok(res, await prisma.organisation.findUniqueOrThrow({ where: { id: req.params.id } }))));

api.get("/audit-logs", checkPermission("*"), asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage || 20)));
  const where: any = {};
  for (const key of ["entityType", "entityId", "actorId"] as const) if (req.query[key]) (where as any)[key] = String(req.query[key]);
  const total = await prisma.auditLog.count({ where });
  const data = await prisma.auditLog.findMany({ where, skip: (page - 1) * perPage, take: perPage, orderBy: { timestamp: "desc" } });
  return ok(res, data, { page, perPage, total, totalPages: Math.ceil(total / perPage) });
}));

app.use("/api/v1", api);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) return fail(res, 422, "VALIDATION_ERROR", "Validation failed.", error.errors);
  if (error instanceof ApiError) return fail(res, error.status, error.code, error.message, error.fieldErrors);
  if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") return fail(res, 409, "CONFLICT", "A unique constraint was violated.");
  console.error(error);
  return fail(res, 500, "INTERNAL_ERROR", "Unexpected server error.");
});

app.listen(PORT, () => {
  console.log(`PDM backend listening on http://localhost:${PORT}`);
});
