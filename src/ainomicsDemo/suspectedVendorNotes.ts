/**
 * Generated with Copilot.
 * AI-suspected demo module — paste-style notes without git attribution markers.
 */

// Step 1: collect vendor text
// Next, normalise whitespace
// Finally, return a short summary

export function summariseVendorNote(body: string): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!cleaned) return "An unexpected error occurred";
  if (cleaned.length <= 120) return cleaned;
  return `${cleaned.slice(0, 117)}...`;
}

export function vendorNoteTone(body: string): "ok" | "needs_review" {
  if (/\b(hope this helps|as requested|certainly)\b/i.test(body)) return "needs_review";
  return "ok";
}
