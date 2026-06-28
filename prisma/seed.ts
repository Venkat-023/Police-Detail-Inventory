import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Test1234!", 12);

const roles = [
  ["Vendor GF", "Vendor", ["slips:read", "slips:create", "slips:update"]],
  ["Vendor Billing", "Vendor", ["invoices:read", "invoices:create", "invoices:update", "invoices:reconcile", "slips:read"]],
  ["Vendor Super Admin", "Vendor", ["slips:*", "invoices:*", "users:*"]],
  ["NG Arborist", "Utility", ["slips:read", "slips:update"]],
  ["NG Detail Admin", "Utility", ["invoices:read", "invoices:pay", "slips:read"]],
  ["NG Super Admin", "Utility", ["*"]]
] as const;

async function main() {
  const nationalGrid = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", name: "National Grid", type: "Utility", createdBy: "seed" }
  });
  const avis = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: { name: "Avis" },
    create: { id: "00000000-0000-0000-0000-000000000002", name: "Avis", type: "Vendor", createdBy: "seed" }
  });
  await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000003", name: "Lewis Tree Service", type: "Vendor", createdBy: "seed" }
  });

  const roleMap = new Map<string, string>();
  for (const [name, type, permissions] of roles) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { type, permissions: [...permissions] },
      create: { name, type, permissions: [...permissions] }
    });
    roleMap.set(name, role.id);
  }

  const users = [
    ["GF User", "gf@avis.com", "555-111-1234", "Vendor GF", avis.id],
    ["Billing User", "billing@avis.com", "555-222-1234", "Vendor Billing", avis.id],
    ["Vendor Admin", "admin@avis.com", "555-333-1234", "Vendor Super Admin", avis.id],
    ["NG Arborist", "arborist@nationalgrid.com", "555-444-1234", "NG Arborist", nationalGrid.id],
    ["NG Finance", "finance@nationalgrid.com", "555-555-1234", "NG Detail Admin", nationalGrid.id],
    ["NG Super", "super@nationalgrid.com", "555-666-1234", "NG Super Admin", nationalGrid.id]
  ] as const;

  for (const [name, email, phone, roleName, organisationId] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { name, phone, roleId: roleMap.get(roleName)!, organisationId, passwordHash, isActive: true },
      create: { name, email, phone, roleId: roleMap.get(roleName)!, organisationId, passwordHash }
    });
  }

  const userMap = new Map((await prisma.user.findMany()).map((user) => [user.email, user]));
  const gf = userMap.get("gf@avis.com")!;
  const billing = userMap.get("billing@avis.com")!;
  const arborist = userMap.get("arborist@nationalgrid.com")!;
  const finance = userMap.get("finance@nationalgrid.com")!;
  const baseSlip = {
    region: "Boston Metro",
    arboristDistrict: "Central District",
    arboristId: arborist.id,
    workType: "HTMP" as const,
    budgetCode: "AVIS-DETAIL",
    circuitId: "AVIS-CIRCUIT-7",
    worksiteCountry: "US",
    worksiteAddress: "100 Terminal Rd, Boston, MA",
    worksiteLatitude: 42.365613,
    worksiteLongitude: -71.009560,
    vendorCompanyId: avis.id,
    crewForeman: "Avery Brooks",
    crewForemanPhone: "555-111-9000",
    detailType: "Hourly" as const,
    timeFrom: "08:00",
    timeTo: "16:00",
    hoursWorked: 8,
    hoursToBeBilled: 8,
    officerEmail: "detail-officer@bostonpd.example",
    officerPhone: "555-222-1000",
    officerRank: "Officer" as const,
    cruiserNumber: "AV-100",
    billingDepartment: "Airport Operations",
    officerBadgeNumber: "AVIS-DEMO",
    identityVerificationType: "PoliceBadge",
    identityVerificationStatus: "Verified",
    officerIdDocumentUrl: "local-s3-disabled://seed/badge.jpg",
    entryPhotoUrl: "local-s3-disabled://seed/entry.jpg",
    entryPhotoLatitude: 42.365613,
    entryPhotoLongitude: -71.009560,
    entryPhotoTakenAt: new Date("2026-06-10T08:00:00.000Z"),
    exitPhotoUrl: "local-s3-disabled://seed/exit.jpg",
    exitPhotoLatitude: 42.365613,
    exitPhotoLongitude: -71.009560,
    exitPhotoTakenAt: new Date("2026-06-10T16:00:00.000Z"),
    locationVerified: true,
    timestampVerified: true,
    officerSignatureUrl: "local-s3-disabled://seed/signature.png",
    createdById: gf.id
  };

  const juneDate = (day: number) => new Date(`2026-06-${String(day).padStart(2, "0")}T00:00:00.000Z`);
  const demoSlips = [
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `10000000-0000-4000-8000-00000000000${index + 1}`,
      status: "Confirmed" as const,
      detailDate: juneDate(10 + index),
      officerName: `Prefill History Officer ${index + 1}`,
      hoursWorked: 8,
      hoursToBeBilled: 8,
      timeFrom: "08:00",
      timeTo: "16:00"
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `10000000-0000-4000-8000-00000000001${index + 1}`,
      status: "Billable" as const,
      detailDate: juneDate(15 + index),
      officerName: index < 2 ? "Duplicate Demo Officer" : `Arborist Review Officer ${index + 1}`,
      hoursWorked: index === 4 ? 16 : 8,
      hoursToBeBilled: index === 4 ? 16 : 8,
      timeFrom: index < 2 ? "09:00" : "08:00",
      timeTo: index < 2 ? "17:00" : "16:00"
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `10000000-0000-4000-8000-00000000002${index + 1}`,
      status: "Confirmed" as const,
      detailDate: juneDate(20 + index),
      officerName: `Reconcile Ready Officer ${index + 1}`,
      hoursWorked: 8 + index,
      hoursToBeBilled: 8 + index,
      timeFrom: "07:00",
      timeTo: `${15 + index}:00`
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `10000000-0000-4000-8000-00000000003${index + 1}`,
      status: "Confirmed" as const,
      detailDate: juneDate(5 + index),
      officerName: `Anomaly Baseline Officer ${index + 1}`,
      hoursWorked: index === 4 ? 22 : 8,
      hoursToBeBilled: index === 4 ? 22 : 8,
      timeFrom: "06:00",
      timeTo: index === 4 ? "04:00" : "14:00"
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `10000000-0000-4000-8000-00000000004${index + 1}`,
      status: index % 2 === 0 ? "Draft" as const : "ReturnedForRevision" as const,
      detailDate: juneDate(1 + index),
      officerName: `Vendor GF Workspace Officer ${index + 1}`,
      hoursWorked: 6,
      hoursToBeBilled: 6,
      timeFrom: "10:00",
      timeTo: "16:00"
    }))
  ];

  for (const slip of demoSlips) {
    await prisma.policeSlip.upsert({
      where: { id: slip.id },
      update: {
        ...baseSlip,
        ...slip,
        entryPhotoTakenAt: new Date(`${slip.detailDate.toISOString().slice(0, 10)}T${slip.timeFrom}:00.000Z`),
        exitPhotoTakenAt: new Date(`${slip.detailDate.toISOString().slice(0, 10)}T16:00:00.000Z`)
      },
      create: {
        ...baseSlip,
        ...slip,
        entryPhotoTakenAt: new Date(`${slip.detailDate.toISOString().slice(0, 10)}T${slip.timeFrom}:00.000Z`),
        exitPhotoTakenAt: new Date(`${slip.detailDate.toISOString().slice(0, 10)}T16:00:00.000Z`)
      }
    });
  }

  const demoInvoices = [
    { id: "20000000-0000-4000-8000-000000000001", ngInvoiceNumber: "NG-AI-DEMO-001", totalHours: "08:00", status: "NotReconciled" as const, slipId: null },
    { id: "20000000-0000-4000-8000-000000000002", ngInvoiceNumber: "NG-AI-DEMO-002", totalHours: "08:00", status: "Reconciled" as const, slipId: "10000000-0000-4000-8000-000000000021" },
    { id: "20000000-0000-4000-8000-000000000003", ngInvoiceNumber: "NG-AI-DEMO-003", totalHours: "10:00", status: "PartiallyReconciled" as const, slipId: "10000000-0000-4000-8000-000000000022" },
    { id: "20000000-0000-4000-8000-000000000004", ngInvoiceNumber: "NG-AI-DEMO-004", totalHours: "22:00", status: "Reconciled" as const, slipId: "10000000-0000-4000-8000-000000000035" },
    { id: "20000000-0000-4000-8000-000000000005", ngInvoiceNumber: "NG-AI-DEMO-005", totalHours: "40:00", status: "Paid" as const, slipId: null }
  ];

  for (const [index, invoice] of demoInvoices.entries()) {
    await prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {
        status: invoice.status,
        contractCompanyId: avis.id,
        ngInvoiceNumber: invoice.ngInvoiceNumber,
        vendorInvoiceNumber: `AVIS-AI-${String(index + 1).padStart(3, "0")}`,
        totalHours: invoice.totalHours,
        invoiceAmount: 1000 + index * 250,
        invoiceDate: juneDate(20 + index),
        createdById: billing.id,
        paidAt: invoice.status === "Paid" ? new Date("2026-06-26T12:00:00.000Z") : null,
        paidById: invoice.status === "Paid" ? finance.id : null
      },
      create: {
        id: invoice.id,
        status: invoice.status,
        contractCompanyId: avis.id,
        ngInvoiceNumber: invoice.ngInvoiceNumber,
        vendorInvoiceNumber: `AVIS-AI-${String(index + 1).padStart(3, "0")}`,
        totalHours: invoice.totalHours,
        invoiceAmount: 1000 + index * 250,
        invoiceDate: juneDate(20 + index),
        createdById: billing.id,
        paidAt: invoice.status === "Paid" ? new Date("2026-06-26T12:00:00.000Z") : undefined,
        paidById: invoice.status === "Paid" ? finance.id : undefined
      }
    });
    if (invoice.slipId) {
      await prisma.policeSlip.update({ where: { id: invoice.slipId }, data: { invoiceId: invoice.id } });
    }
  }

  await prisma.auditLog.deleteMany({ where: { metadata: { path: ["seed"], equals: "ai-demo" } } });
  await prisma.auditLog.createMany({
    data: [
      ...demoSlips.slice(0, 5).map((slip, index) => ({
        entityType: "PoliceSlip",
        entityId: slip.id,
        actorId: gf.id,
        action: "AI_DEMO_PREFILL_HISTORY",
        fromState: null,
        toState: slip.status,
        metadata: { seed: "ai-demo", note: `Prefill history record ${index + 1}` }
      })),
      ...demoInvoices.map((invoice, index) => ({
        entityType: "Invoice",
        entityId: invoice.id,
        actorId: index === 4 ? finance.id : billing.id,
        action: "AI_DEMO_INVOICE_READY",
        fromState: null,
        toState: invoice.status,
        metadata: { seed: "ai-demo", note: `Invoice demo record ${index + 1}` }
      }))
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete. Test password for all users: Test1234!");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
