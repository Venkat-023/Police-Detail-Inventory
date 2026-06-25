import type { AuditEntry } from "@/types";

export const auditLogs: AuditEntry[] = [
  {
    id: "aud-1", entityType: "Slip", entityId: "slip-00009",
    timestamp: "2024-03-15T14:23:00Z",
    actorId: "u-arb-1", actorName: "Alice Reeves", actorRole: "NG Arborist",
    action: "Transitioned status", fromState: "Billable", toState: "Confirmed",
    ipAddress: "10.0.1.55",
  },
  {
    id: "aud-2", entityType: "Slip", entityId: "slip-00009",
    timestamp: "2024-03-14T08:45:00Z",
    actorId: "u-gf-1", actorName: "George Fenton", actorRole: "Vendor GF",
    action: "Submitted as Billable", fromState: "Draft", toState: "Billable",
    ipAddress: "192.168.1.10",
  },
  {
    id: "aud-3", entityType: "Invoice", entityId: "inv-003",
    timestamp: "2024-03-10T14:00:00Z",
    actorId: "u-fin-1", actorName: "Frank Nash", actorRole: "NG Detail Admin",
    action: "Marked as Paid", fromState: "Reconciled", toState: "Paid",
    ipAddress: "10.0.1.60",
  },
  {
    id: "aud-4", entityType: "User", entityId: "u-gf-2",
    timestamp: "2024-02-01T10:00:00Z",
    actorId: "u-vsa-1", actorName: "Victor Sandez", actorRole: "Vendor Super Admin",
    action: "Created user", ipAddress: "192.168.1.5",
  },
  {
    id: "aud-5", entityType: "Slip", entityId: "slip-00019",
    timestamp: "2024-03-16T11:30:00Z",
    actorId: "u-gf-1", actorName: "George Fenton", actorRole: "Vendor GF",
    action: "Marked Non-Billable", fromState: "Draft", toState: "NonBillable",
    ipAddress: "192.168.1.10",
  },
];
