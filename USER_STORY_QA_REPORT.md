# User Story Workflow QA Report

Generated: 2026-06-28T17:10:28.744Z
Backend: http://localhost:3001
Frontend: http://localhost:3000

## Summary

- PASS: 26
- FAIL: 0
- GAP: 0
- WARN: 1

## Results

| Persona | Story | Check | Status | Details |
|---|---|---|---|---|
| Vendor GF | Persona access | Login with seeded account | PASS | gf@avis.com authenticated |
| Vendor Billing | Persona access | Login with seeded account | PASS | billing@avis.com authenticated |
| Vendor Super Admin | Persona access | Login with seeded account | PASS | admin@avis.com authenticated |
| NG Arborist | Persona access | Login with seeded account | PASS | arborist@nationalgrid.com authenticated |
| NG Detail Admin | Persona access | Login with seeded account | PASS | finance@nationalgrid.com authenticated |
| NG Super Admin | Persona access | Login with seeded account | PASS | super@nationalgrid.com authenticated |
| All | Navigation | Frontend route shell responds | PASS | Statuses: 200, 200, 200 |
| Vendor GF | Create New Slip | Mandatory validation rejects empty slip | PASS | HTTP 422 |
| Vendor GF | Create New Slip | Save partial draft from incomplete form | PASS | HTTP 200, slip PDM-A2191ED4 |
| Vendor GF | Create New Slip | Create complete draft slip | PASS | Slip PDM-DB2291EC status Draft |
| Vendor GF | Create New Slip | Billable submission requires badge and geo evidence | PASS | HTTP 422 |
| Vendor GF | Create New Slip | Submit billable slip with police badge and entry/exit geo photos | PASS | Status Billable, locationVerified=true, timestampVerified=true |
| Vendor GF | Create New Slip | Photo geotag source | WARN | Workflow records browser geolocation at upload time; it does not yet parse EXIF metadata from the photo file. |
| NG Arborist | Confirm Billable Slip | Confirm billable slip | PASS | Slip PDM-92C5A432 status Confirmed |
| NG Arborist | Confirm Billable Slip | Reject billable slip with comments | PASS | Slip PDM-F39D301B status NonBillable |
| NG Arborist | Confirm Billable Slip | Return slip for revision | PASS | Slip PDM-00ACE9CA status ReturnedForRevision |
| Vendor GF | Create New Slip | Resubmit returned slip after revision | PASS | Slip PDM-00ACE9CA status Billable |
| Vendor Billing | Generate and Reconcile Invoice | Create invoice | PASS | Invoice NG-QA-66628031 status NotReconciled |
| Vendor Billing | Generate and Reconcile Invoice | Confirmed slip appears for reconciliation | PASS | 1 available slip(s) |
| Vendor Billing | Generate and Reconcile Invoice | Billing can reconcile matching slip total | PASS | Invoice status Reconciled |
| NG Detail Admin | Move Partially Reconciled Records to Paid | NG Detail Admin cannot reconcile | PASS | HTTP 403 |
| NG Detail Admin | Move Partially Reconciled Records to Paid | Mark reconciled invoice paid | PASS | Invoice status Paid |
| Vendor Billing | Generate and Reconcile Invoice | Exception handling creates partially reconciled invoice | PASS | Invoice status PartiallyReconciled |
| NG Detail Admin | Move Partially Reconciled Records to Paid | Move partially reconciled invoice to paid | PASS | HTTP 200, invoice status Paid |
| NG Detail Admin | Move Partially Reconciled Records to Paid | Invoice audit trail is visible | PASS | 3 audit event(s) |
| Vendor Super Admin | Admin | Vendor admin can manage scoped users | PASS | 6 user(s) visible |
| NG Super Admin | Admin | NG super admin can read roles and audit logs | PASS | 6 roles, 19 audit log(s) |

## Notes

- Seeded test password: `Test1234!`.
- This test creates QA slips and invoices in the local database so audit trails and workflow transitions can be checked.
- `GAP` means the system is stable but the implementation does not yet match the user story exactly.
- `WARN` means the workflow works, but the implementation needs hardening before production use.
