import type { User } from "@/types";
import { roles } from "./roles";
import { organisations } from "./organisations";

function makeUser(
  id: string, name: string, email: string, phone: string,
  orgId: string, roleName: User["roleName"], active = true,
): User {
  const role = roles.find((r) => r.name === roleName)!;
  const org = organisations.find((o) => o.id === orgId)!;
  return {
    id, name, email, phone,
    organisationId: orgId, organisationName: org.name,
    roleId: role.id, roleName, scope: role.scope,
    permissions: [...role.permissions],
    active,
    createdAt: "2024-01-15T10:00:00Z",
  };
}

export const users: User[] = [
  makeUser("u-gf-1", "George Fenton", "gf@avis.com", "555-201-3001", "org-cc", "Vendor GF"),
  makeUser("u-bill-1", "Bianca Lloyd", "billing@avis.com", "555-201-3002", "org-cc", "Vendor Billing"),
  makeUser("u-vsa-1", "Victor Sandez", "admin@avis.com", "555-201-3003", "org-cc", "Vendor Super Admin"),
  makeUser("u-arb-1", "Alice Reeves", "arborist@nationalgrid.com", "555-301-4001", "org-ng", "NG Arborist"),
  makeUser("u-fin-1", "Frank Nash", "finance@nationalgrid.com", "555-301-4002", "org-ng", "NG Detail Admin"),
  makeUser("u-sup-1", "Sandra Pierce", "super@nationalgrid.com", "555-301-4003", "org-ng", "NG Super Admin"),
  makeUser("u-arb-2", "Adrian Cole", "acole@nationalgrid.com", "555-301-4011", "org-ng", "NG Arborist"),
  makeUser("u-gf-2", "Glen Foster", "glen@avis.com", "555-201-3011", "org-cc", "Vendor GF"),
  makeUser("u-acme-gf", "Tom Hill", "tom@acme.com", "555-401-5001", "org-acme", "Vendor GF"),
];

// Mock password for all users
export const MOCK_PASSWORD = "Test1234!";
