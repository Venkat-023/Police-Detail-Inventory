import { delay, logAiFeature } from "./log.js";

export interface SignatureVerificationResult {
  _stub: true;
  isValid: boolean;
  confidence: number;
  message: string;
}

export async function verifySignature(slipId: string, userId?: string): Promise<SignatureVerificationResult> {
  const startedAt = Date.now();
  await delay(600);
  const result: SignatureVerificationResult = {
    _stub: true,
    isValid: true,
    confidence: 0.91,
    message: "Signature verification stub: production implementation uses computer vision to validate officer signature authenticity.",
  };
  await logAiFeature("signature_verification", { slipId }, result, startedAt, userId);
  return result;
}
