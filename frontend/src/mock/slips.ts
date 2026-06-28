import type { PoliceSlip, SlipStatus } from "@/types";
import { calculateHoursWorked } from "@/utils/hoursCalc";

const ARBORISTS = [
  { id: "u-arb-1", name: "Alice Reeves", district: "North District" },
  { id: "u-arb-2", name: "Adrian Cole", district: "South District" },
];

const OFFICERS = [
  { name: "James Rodriguez", email: "jrod@bostonpd.gov", phone: "617-555-1001", rank: "Officer" as const, cruiser: "C-204", dept: "Boston PD - Traffic Div" },
  { name: "Maria Chen", email: "mchen@bostonpd.gov", phone: "617-555-1002", rank: "Sergeant" as const, cruiser: "C-118", dept: "Boston PD - Patrol" },
  { name: "David Park", email: "dpark@cambridgepd.gov", phone: "617-555-1003", rank: "Officer" as const, cruiser: "CB-22", dept: "Cambridge PD" },
  { name: "Sarah O'Neil", email: "soneil@worcesterpd.gov", phone: "508-555-1004", rank: "Lieutenant" as const, cruiser: "W-301", dept: "Worcester PD" },
  { name: "Michael Reeves", email: "mreeves@somervillepd.gov", phone: "617-555-1005", rank: "Detective" as const, cruiser: "S-15", dept: "Somerville PD" },
];

function pad(n: number) { return n.toString().padStart(5, "0"); }

function makeSlip(
  i: number,
  status: SlipStatus,
  createdBy: { id: string; name: string },
  orgId: string,
  vendorCompany: string,
  daysAgo: number,
  invoiceId?: string,
): PoliceSlip {
  const arb = ARBORISTS[i % ARBORISTS.length];
  const off = OFFICERS[i % OFFICERS.length];
  const timeFrom = ["08:00", "10:30", "14:00", "20:00", "06:00"][i % 5];
  const timeTo = ["16:00", "18:30", "22:00", "04:00", "14:00"][i % 5];
  const hw = calculateHoursWorked(timeFrom, timeTo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const detailDate = d.toISOString().slice(0, 10);
  return {
    id: `slip-${pad(i)}`,
    slipNumber: `PDM-${pad(i)}`,
    region: ["Boston Metro", "North Shore", "Central MA", "Cape Cod"][i % 4],
    arboristDistrict: arb.district,
    arboristId: arb.id,
    arboristName: arb.name,
    workType: i % 3 === 0 ? "Trimming" : "HTMP",
    budgetCode: `BC-${1000 + i}`,
    circuitId: `CKT-${500 + i}`,
    organisationId: orgId,
    vendorCompany,
    crewForeman: ["John Smith", "Mike Brown", "Tom Hill"][i % 3],
    crewForemanPhone: "555-111-2200",
    detailDate,
    detailType: "Hourly",
    timeFrom, timeTo,
    hoursWorked: hw,
    hoursToBeBilled: hw,
    officerName: off.name,
    officerEmail: off.email,
    officerPhone: off.phone,
    officerRank: off.rank,
    cruiserNumber: off.cruiser,
    billingDepartment: off.dept,
    officerSignatureUrl: status !== "Draft" ? "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><path d='M10 40 Q 30 10 50 40 T 90 40 T 130 40 T 170 40' fill='none' stroke='%23111' stroke-width='2'/></svg>" : undefined,
    status,
    createdById: createdBy.id,
    createdByName: createdBy.name,
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    invoiceId,
  };
}

const CC = { orgId: "org-cc", name: "Avis" };
const ACME = { orgId: "org-acme", name: "Acme Tree Services" };
const GF1 = { id: "u-gf-1", name: "George Fenton" };
const GF2 = { id: "u-gf-2", name: "Glen Foster" };
const ACME_GF = { id: "u-acme-gf", name: "Tom Hill" };

export const slips: PoliceSlip[] = [
  // Drafts
  makeSlip(1, "Draft", GF1, CC.orgId, CC.name, 0),
  makeSlip(2, "Draft", GF1, CC.orgId, CC.name, 1),
  makeSlip(3, "Draft", GF2, CC.orgId, CC.name, 2),
  // Billable (awaiting arborist review)
  makeSlip(4, "Billable", GF1, CC.orgId, CC.name, 3),
  makeSlip(5, "Billable", GF1, CC.orgId, CC.name, 5),
  makeSlip(6, "Billable", GF2, CC.orgId, CC.name, 7),
  makeSlip(7, "Billable", ACME_GF, ACME.orgId, ACME.name, 4),
  makeSlip(8, "Billable", GF1, CC.orgId, CC.name, 8),
  // Confirmed
  makeSlip(9, "Confirmed", GF1, CC.orgId, CC.name, 10),
  makeSlip(10, "Confirmed", GF1, CC.orgId, CC.name, 12),
  makeSlip(11, "Confirmed", GF2, CC.orgId, CC.name, 14),
  makeSlip(12, "Confirmed", GF1, CC.orgId, CC.name, 15),
  makeSlip(13, "Confirmed", ACME_GF, ACME.orgId, ACME.name, 11),
  makeSlip(14, "Confirmed", GF1, CC.orgId, CC.name, 18),
  makeSlip(15, "Confirmed", GF2, CC.orgId, CC.name, 20),
  // Confirmed + attached to invoice
  makeSlip(16, "Confirmed", GF1, CC.orgId, CC.name, 22, "inv-001"),
  makeSlip(17, "Confirmed", GF1, CC.orgId, CC.name, 23, "inv-001"),
  makeSlip(18, "Confirmed", GF2, CC.orgId, CC.name, 25, "inv-002"),
  // Non-billable
  makeSlip(19, "NonBillable", GF1, CC.orgId, CC.name, 16),
  makeSlip(20, "NonBillable", ACME_GF, ACME.orgId, ACME.name, 17),
];
