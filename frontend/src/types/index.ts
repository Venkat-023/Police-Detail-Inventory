// PDM Domain Types

export type AppScope = "Utility" | "Vendor";

export type RoleName =
  | "Vendor GF"
  | "Vendor Billing"
  | "Vendor Super Admin"
  | "NG Arborist"
  | "NG Detail Admin"
  | "NG Super Admin";

export interface Role {
  id: string;
  name: RoleName;
  scope: AppScope;
  type: "System" | "Custom";
  permissions: string[];
}

export interface Organisation {
  id: string;
  name: string;
  scope: AppScope;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  organisationId: string;
  organisationName: string;
  roleId: string;
  roleName: RoleName;
  scope: AppScope;
  permissions: string[];
  active: boolean;
  createdAt: string;
}

export type SlipStatus = "Draft" | "Billable" | "Confirmed" | "ReturnedForRevision" | "NonBillable";

export interface AuditEntry {
  id: string;
  entityType: "Slip" | "Invoice" | "User" | "Role";
  entityId: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: RoleName;
  action: string;
  fromState?: string;
  toState?: string;
  ipAddress: string;
  meta?: Record<string, unknown>;
}

export interface PoliceSlip {
  id: string;
  slipNumber: string;
  // Location
  region: string;
  arboristDistrict: string;
  arboristId: string;
  arboristName: string;
  workType: "HTMP" | "Trimming";
  budgetCode: string;
  circuitId: string;
  worksiteAddress?: string;
  worksiteLatitude?: number;
  worksiteLongitude?: number;
  // Vendor
  organisationId: string;
  vendorCompany: string;
  crewForeman: string;
  crewForemanPhone: string;
  // Time
  detailDate: string; // YYYY-MM-DD
  detailType: "Hourly";
  timeFrom: string; // HH:MM
  timeTo: string;
  hoursWorked: number;
  hoursToBeBilled: number;
  // Officer
  officerName: string;
  officerEmail: string;
  officerPhone: string;
  officerRank: "Officer" | "Sergeant" | "Lieutenant" | "Captain" | "Detective";
  cruiserNumber: string;
  billingDepartment: string;
  officerBadgeNumber?: string;
  identityVerificationType?: "PoliceBadge" | "GovernmentId";
  identityVerificationStatus?: "Pending" | "Verified" | "Failed";
  officerIdDocumentUrl?: string;
  entryPhotoUrl?: string;
  entryPhotoLatitude?: number;
  entryPhotoLongitude?: number;
  entryPhotoTakenAt?: string;
  exitPhotoUrl?: string;
  exitPhotoLatitude?: number;
  exitPhotoLongitude?: number;
  exitPhotoTakenAt?: string;
  locationVerified?: boolean;
  timestampVerified?: boolean;
  officerSignatureUrl?: string;
  // Meta
  status: SlipStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  nonBillableReason?: string;
  invoiceId?: string; // attached to invoice
}

export type InvoiceStatus =
  | "NotReconciled"
  | "PartiallyReconciled"
  | "Reconciled"
  | "Paid";

export interface Invoice {
  id: string;
  ngInvoiceNumber: string;
  vendorInvoiceNumber?: string;
  organisationId: string;
  vendorCompany: string;
  invoiceDate: string;
  totalHours: string; // HH:MM
  invoiceAmount: number;
  status: InvoiceStatus;
  attachedSlipIds: string[];
  createdById: string;
  createdAt: string;
  paidAt?: string;
  paidById?: string;
  paidByName?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
