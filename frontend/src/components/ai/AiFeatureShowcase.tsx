import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bot, Copy, FileText, ScanLine, ScrollText, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { AiBadge } from "./AiBadge";

const features = [
  {
    title: "Duplicate detection",
    body: "Flags likely duplicate slips while the Vendor GF enters officer, date, and time.",
    rule: "Predefined fallback: no duplicate risk unless matching date, officer, and overlapping time are found.",
    icon: AlertTriangle,
    to: "/slips/new",
  },
  {
    title: "Smart prefill",
    body: "Suggests common region, work type, budget, circuit, crew, and worksite values from history.",
    rule: "Predefined fallback: Boston Metro, HTMP, and AVIS-DETAIL are offered.",
    icon: Copy,
    to: "/slips/new",
  },
  {
    title: "Anomaly detection",
    body: "Highlights unusual slip hours or invoice totals before reconciliation and payment.",
    rule: "Predefined fallback: shows a no-anomaly prototype status when statistics are unavailable.",
    icon: AlertTriangle,
    to: "/invoices",
  },
  {
    title: "Arborist co-pilot",
    body: "Summarises billable slip details and suggests confirm, reject, or review.",
    rule: "Predefined fallback: suggests confirm with evidence and hour-range reasons.",
    icon: Bot,
    to: "/slips",
  },
  {
    title: "Auto-reconciliation",
    body: "Suggests invoice/slip matches when attached slip hours align with invoice hours.",
    rule: "Predefined fallback: advises attaching confirmed slips that match total hours.",
    icon: Wand2,
    to: "/invoices",
  },
  {
    title: "Audit log NLP",
    body: "Provides a plain-language summary of a slip or invoice audit trail.",
    rule: "Predefined fallback: describes standard PDM workflow movement.",
    icon: ScrollText,
    to: "/slips",
  },
  {
    title: "Signature verification",
    body: "Shows prototype officer signature authenticity checks on saved slip forms.",
    rule: "Predefined fallback: accepts signatures for demo purposes.",
    icon: ShieldCheck,
    to: "/slips",
  },
  {
    title: "Report generation",
    body: "Drafts billing summaries and reconciliation reports for admin and finance users.",
    rule: "Predefined fallback: generates a two-section prototype report.",
    icon: FileText,
    to: "/ai-reports",
  },
  {
    title: "OCR ingestion",
    body: "Lets Vendor GF upload a paper slip image and preview extracted fields.",
    rule: "Predefined fallback: returns a structured preview with common time defaults.",
    icon: ScanLine,
    to: "/slips/new",
  },
];

export function AiFeatureShowcase() {
  return (
    <section className="pdm-card mb-6 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Sparkles size={18} /> AI Feature Layer
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Prototype AI remains visible even when the backend AI switch is off, using deterministic rules for testing.
          </p>
        </div>
        <AiBadge prototype />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.title}
              to={feature.to as any}
              className="rounded-md border border-border bg-surface p-3 transition hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon size={16} /> {feature.title}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{feature.body}</p>
              <p className="mt-2 text-xs leading-5 text-primary">{feature.rule}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
