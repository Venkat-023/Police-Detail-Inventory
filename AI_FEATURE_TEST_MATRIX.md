# AI Feature Test Matrix

The AI feature layer is visible from every persona dashboard in the **AI Feature Layer** panel. When the backend AI service is disabled, the frontend uses deterministic prototype rules so users still see useful AI-style guidance.

| Feature | Persona(s) | Where to test | Working behavior | Predefined fallback |
| --- | --- | --- | --- | --- |
| Duplicate detection | Vendor GF | New Slip form, Officer Details | Calls `/api/v1/ai/slips/duplicate-check` when officer/date/time are present | No duplicate risk unless matching officer/date/time overlap is detected |
| Smart prefill | Vendor GF | New Slip form top banner | Calls `/api/v1/ai/slips/prefill` from historical submitted slips | Suggests Boston Metro, HTMP, and AVIS-DETAIL |
| Anomaly detection | Vendor Billing, NG Detail Admin, NG Super Admin | Invoice detail screen | Calls `/api/v1/ai/invoices/:id/anomalies` | Shows a no-anomaly prototype status if statistics are unavailable |
| Arborist co-pilot | NG Arborist | Billable slip detail screen | Calls `/api/v1/ai/slips/:id/arborist-suggestion` | Suggests confirm with evidence and hour-range reasons |
| Auto-reconciliation | Vendor Billing | Invoice detail screen | Calls `/api/v1/ai/invoices/:id/reconcile-suggestion` | Advises attaching confirmed slips that match invoice total hours |
| Audit log NLP | All roles with slip/invoice access | Bottom of slip and invoice detail screens | Calls `/api/v1/ai/audit/:entityType/:entityId/narrative` | Summarises normal PDM workflow movement |
| Signature verification | Vendor GF | Saved/edit slip verification section | Calls `/api/v1/ai/slips/:id/signature-verification` | Accepts signature for demo purposes |
| Report generation | `admin@avis.com`, `finance@nationalgrid.com` | AI Reports nav item | Calls `/api/v1/ai/reports/generate` | Generates a two-section prototype report |
| OCR ingestion | Vendor GF | New Slip form, Scan paper slip panel | Calls `/api/v1/ai/ocr/slip` | Returns a structured preview with common time defaults |

## Seeded Demo Data

Running `npm run seed` creates deterministic demo records:

- 25 AI/demo slips with fixed IDs starting `10000000-0000-4000-8000-...`
- 5 AI/demo invoices with fixed IDs starting `20000000-0000-4000-8000-...`
- 10 AI/demo audit log entries tagged with `{ seed: "ai-demo" }`

The demo slip set includes:

- 5 prefill-history slips owned by `gf@avis.com`
- 5 billable slips for the NG Arborist review queue
- 5 confirmed slips ready for invoice reconciliation
- 5 anomaly baseline/outlier slips for billing review
- 5 Vendor GF workspace slips in draft/returned states

Use these seeded personas:

- `gf@avis.com` / `Test1234!`
- `billing@avis.com` / `Test1234!`
- `admin@avis.com` / `Test1234!`
- `arborist@nationalgrid.com` / `Test1234!`
- `finance@nationalgrid.com` / `Test1234!`
- `super@nationalgrid.com` / `Test1234!`
