import type { Role } from "@/types";

const ALL_PERMISSIONS = [
  "slips:read", "slips:create", "slips:update", "slips:delete",
  "slips:transition:billable", "slips:transition:confirmed", "slips:transition:nonbillable",
  "invoices:read", "invoices:create", "invoices:update", "invoices:delete",
  "invoices:reconcile", "invoices:pay",
  "users:read", "users:create", "users:update", "users:delete",
  "roles:read", "roles:create", "roles:update", "roles:delete",
  "audit:read", "orgs:read", "orgs:create", "orgs:update",
];

function wildcard(...prefixes: string[]): string[] {
  return ALL_PERMISSIONS.filter((p) => prefixes.some((pre) => p.startsWith(pre)));
}

export const roles: Role[] = [
  {
    id: "role-vgf",
    name: "Vendor GF",
    scope: "Vendor",
    type: "System",
    permissions: ["slips:read", "slips:create", "slips:update", "slips:transition:billable", "slips:transition:nonbillable"],
  },
  {
    id: "role-vbill",
    name: "Vendor Billing",
    scope: "Vendor",
    type: "System",
    permissions: ["invoices:read", "invoices:create", "invoices:update", "invoices:reconcile", "slips:read"],
  },
  {
    id: "role-vsa",
    name: "Vendor Super Admin",
    scope: "Vendor",
    type: "System",
    permissions: [...wildcard("slips:", "invoices:"), "users:read", "users:create", "users:update", "users:delete"],
  },
  {
    id: "role-ngarb",
    name: "NG Arborist",
    scope: "Utility",
    type: "System",
    permissions: ["slips:read", "slips:transition:confirmed", "slips:transition:nonbillable"],
  },
  {
    id: "role-ngda",
    name: "NG Detail Admin",
    scope: "Utility",
    type: "System",
    permissions: ["invoices:read", "invoices:reconcile", "invoices:pay", "slips:read"],
  },
  {
    id: "role-ngsa",
    name: "NG Super Admin",
    scope: "Utility",
    type: "System",
    permissions: [...ALL_PERMISSIONS],
  },
];

export const ALL_PERMISSION_LIST = ALL_PERMISSIONS;
