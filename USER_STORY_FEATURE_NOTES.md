# User Story Feature Notes

Source: `C:\Users\admin\Desktop\Avis user stories.docx`

Checked against the running app at `http://127.0.0.1:3000/` and the backend API at `http://localhost:3001/api/v1`.

## Verified Working Happy Path

- GF creates a slip and submits it as Billable.
- Arborist reviews the Billable slip and marks it Confirmed.
- Vendor Admin creates an invoice and reconciles the Confirmed slip.
- NG Detail Admin marks a Reconciled invoice as Paid.

Test result:

- Created slip status: `Billable`
- Arborist-confirmed slip status: `Confirmed`
- Reconciled invoice status: `Reconciled`
- Paid invoice status: `Paid`

## Story 1: Create a New Slip

Status: **Mostly implemented**

Implemented features:

- GF role can open `New Slip`.
- Slip form captures location, metadata, vendor details, time tracking, officer details, and signature.
- Mandatory field validation exists through form validation.
- Slip can be saved as `Draft`.
- Draft slips can be edited later.
- Duplicate slip check exists in backend.
- Signature pad exists in UI.
- Submit as Billable exists and moves status to `Billable`.
- Backend records create/status-change audit entries.
- UI displays confirmation toasts after save/submit.
- Backend generates a unique UUID and frontend displays a `PDM-...` slip number.

Partial or mismatched items:

- User story says statuses `Created`, `Pending Review`, and `Signed`; app uses `Draft`, `Billable`, `Confirmed`, and `NonBillable`.
- Digital signature is captured, but signer name/date/timestamp are not modeled as separate fields.
- Billable submission currently requires backend verification fields. The frontend adapter fills local test placeholders for photo/location/timestamp verification until the real UI captures those documents.

Missing or not explicit:

- No separate `Signed` status.
- No explicit customer information section; current form uses worksite/vendor/officer/billing fields.

## Story 2: Confirm Billable Slip

Status: **Partially implemented**

Implemented features:

- Arborist dashboard has a pending Billable review queue.
- Arborist can view Billable slip details.
- Arborist can mark a Billable slip as `Confirmed`.
- Backend restricts `Billable -> Confirmed` to the `NG Arborist` role.
- Backend audit log records status transition.
- Arborist can mark a Billable slip as `NonBillable` with a required reason.

Partial or mismatched items:

- User story status `Arborist Confirmed` maps to app status `Confirmed`.
- Reject flow maps to `NonBillable`, not `Returned for Revision`.
- Rejection/non-billable reason is captured in audit metadata, but not exposed as a full comments thread.

Missing:

- No `Returned for Revision` status.
- No correction loop back to GF for returned slips.
- No general review comments/notes feature visible to GF and stakeholders.

## Story 3: Generate and Reconcile Invoice

Status: **Partially implemented**

Implemented features:

- Invoice creation screen exists.
- Invoice fields include NG invoice number, vendor invoice number, total hours, amount, and invoice date.
- Invoice detail screen supports attaching available Confirmed slips.
- Drag/drop and button controls move slips between available and attached lists.
- Reconciliation compares invoice total hours against attached slip billable hours.
- Backend updates invoice to `Reconciled` when hours match, otherwise `PartiallyReconciled`.
- Backend prevents attaching non-Confirmed slips.
- Backend prevents attaching slips from another organisation.
- Backend audit log records invoice create/status changes.

Partial or mismatched items:

- Story says Billing Specialist selects slips first and system generates invoice/amount. Current app creates invoice first, then attaches/reconciles slips.
- Total invoice amount is manually entered; it is not calculated from slip values.
- Reconciliation compares hours, not dollar amounts/slip values.
- Backend supports reconciliation via `invoices:reconcile`, but seeded `Vendor Billing` role does not currently have that permission. Vendor Super Admin can reconcile.

Missing:

- No billing period field.
- No individual slip amount calculation/display.
- No automated invoice number generation.
- No explicit discrepancy resolution workflow beyond showing hour difference and status.
- No correction audit trail for reconciliation exceptions beyond standard audit entries.

## Story 4: Move Partially Reconciled Records to Paid Status

Status: **Partially implemented**

Implemented features:

- NG Detail Admin dashboard shows reconciled/payment-related KPIs.
- NG Detail Admin can mark invoices as `Paid`.
- Backend records `paidAt` and `paidById`.
- Backend audit log records `Reconciled -> Paid` status change.
- Paid invoices are locked from further reconciliation/edit actions in UI.

Partial or mismatched items:

- User story says move `Partially Reconciled -> Paid` after resolving remaining issues.
- Current backend only allows `Reconciled -> Paid`.
- UI payment action is shown for `Reconciled` invoices, not `PartiallyReconciled`.

Missing:

- No workflow to resolve a `PartiallyReconciled` invoice into payable state except reconciling it to exact matching hours.
- No payment reference number field.
- Invoice history view for invoice-specific audit is supported in backend but not prominently shown in the invoice detail UI.

## Cross-Cutting Features Present

- Role-based dashboards for GF, Vendor Billing, Vendor Admin, Arborist, NG Detail Admin, and NG Super Admin.
- JWT login and persisted frontend session.
- Role/permission-gated navigation.
- Audit log backend model and admin audit page.
- User and role management screens.
- Organisation scoping for vendor users.
- Status badges and status filters for slips/invoices.

## Highest Priority Gaps

1. Add `ReturnedForRevision` or equivalent status and GF correction loop.
2. Add review comments/notes visible across stakeholders.
3. Decide whether `Vendor Billing` should have `invoices:reconcile`; current story says yes, current seed says no.
4. Add slip amount/rate model if invoice reconciliation must compare money, not only hours.
5. Add billing period and payment reference fields.
6. Decide whether payment should allow `PartiallyReconciled -> Paid` or keep stricter `Reconciled -> Paid`.
7. Capture digital signature signer name/date/timestamp as explicit fields.
