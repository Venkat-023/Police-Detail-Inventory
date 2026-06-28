import { delay, logAiFeature } from "./log.js";

export interface OcrResult {
  _stub: true;
  extractedFields: Record<string, string>;
  confidence: number;
  message: string;
}

export async function extractSlipFromImage(imageBase64: string, userId?: string): Promise<OcrResult> {
  const startedAt = Date.now();
  await delay(700);
  const result: OcrResult = {
    _stub: true,
    extractedFields: {
      detailDate: "",
      timeFrom: "",
      timeTo: "",
      officerName: "",
      worksiteAddress: "",
    },
    confidence: 0,
    message: "OCR ingestion stub: production implementation will extract structured slip fields from a photograph using document intelligence.",
  };
  await logAiFeature("ocr_slip", { imageBase64Length: imageBase64.length }, result, startedAt, userId);
  return result;
}
