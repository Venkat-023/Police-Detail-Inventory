import { NextFunction, Request, Response } from "express";
import { aiConfig } from "../config/ai.js";

export function requireAiEnabled(_req: Request, res: Response, next: NextFunction) {
  if (!aiConfig.enabled) {
    res.status(404).json({ error: "AI features are not enabled on this instance." });
    return;
  }
  next();
}
