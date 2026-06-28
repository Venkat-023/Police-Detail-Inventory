import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { requireAiEnabled } from "../ai/guard.js";
import { authenticate } from "../middleware/auth.js";
import { detectDuplicates } from "../ai/duplicate.service.js";
import { getPrefillSuggestions } from "../ai/prefill.service.js";
import { analyseInvoiceAnomalies } from "../ai/anomaly.service.js";
import { getArboristSuggestion } from "../ai/arborist.service.js";
import { getReconcileSuggestion } from "../ai/reconcile.service.js";
import { getAuditNarrative } from "../ai/auditNlp.service.js";
import { verifySignature } from "../ai/signature.service.js";
import { generateReport } from "../ai/report.service.js";
import { extractSlipFromImage } from "../ai/ocr.service.js";

export const aiRouter = Router();
const asyncRoute = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);

aiRouter.use(requireAiEnabled);
aiRouter.use(authenticate);

aiRouter.post("/slips/duplicate-check", asyncRoute(async (req, res) => {
  const schema = z.object({
    officerId: z.string().optional(),
    officerName: z.string().optional(),
    slipDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    worksiteId: z.string().optional(),
    circuitId: z.string().optional(),
    excludeSlipId: z.string().optional(),
  }).refine((body) => !!body.officerId || !!body.officerName, { message: "officerId or officerName is required" });
  const body = schema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error });
    return;
  }
  res.json(await detectDuplicates(body.data));
}));

aiRouter.get("/slips/prefill", asyncRoute(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  res.json({ suggestions: await getPrefillSuggestions(userId) });
}));

aiRouter.get("/invoices/:id/anomalies", asyncRoute(async (req, res) => {
  res.json(await analyseInvoiceAnomalies(req.params.id));
}));

aiRouter.get("/slips/:id/arborist-suggestion", asyncRoute(async (req, res) => {
  res.json(await getArboristSuggestion(req.params.id, req.user?.id));
}));

aiRouter.get("/invoices/:id/reconcile-suggestion", asyncRoute(async (req, res) => {
  res.json(await getReconcileSuggestion(req.params.id, req.user?.id));
}));

aiRouter.get("/audit/:entityType/:entityId/narrative", asyncRoute(async (req, res) => {
  res.json(await getAuditNarrative(req.params.entityType, req.params.entityId, req.user?.id));
}));

aiRouter.get("/slips/:id/signature-verification", asyncRoute(async (req, res) => {
  res.json(await verifySignature(req.params.id, req.user?.id));
}));

aiRouter.post("/reports/generate", asyncRoute(async (req, res) => {
  const schema = z.object({
    type: z.enum(["billing", "reconciliation"]),
    periodStart: z.string(),
    periodEnd: z.string(),
    organisationId: z.string(),
  });
  const body = schema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error });
    return;
  }
  res.json(await generateReport(body.data.type, body.data.periodStart, body.data.periodEnd, body.data.organisationId, req.user?.id));
}));

aiRouter.post("/ocr/slip", asyncRoute(async (req, res) => {
  const schema = z.object({ imageBase64: z.string() });
  const body = schema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error });
    return;
  }
  res.json(await extractSlipFromImage(body.data.imageBase64, req.user?.id));
}));
