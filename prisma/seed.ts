import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("Test1234!", 12);

const roles = [
  ["Vendor GF", "Vendor", ["slips:read", "slips:create", "slips:update"]],
  ["Vendor Billing", "Vendor", ["invoices:read", "invoices:create", "invoices:update", "slips:read"]],
  ["Vendor Super Admin", "Vendor", ["slips:*", "invoices:*", "users:*"]],
  ["NG Arborist", "Utility", ["slips:read", "slips:update"]],
  ["NG Detail Admin", "Utility", ["invoices:read", "invoices:reconcile", "slips:read"]],
  ["NG Super Admin", "Utility", ["*"]]
] as const;

async function main() {
  const nationalGrid = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", name: "National Grid", type: "Utility", createdBy: "seed" }
  });
  const compileCraft = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000002", name: "Compile Craft", type: "Vendor", createdBy: "seed" }
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
    ["GF User", "gf@compilecraft.com", "555-111-1234", "Vendor GF", compileCraft.id],
    ["Billing User", "billing@compilecraft.com", "555-222-1234", "Vendor Billing", compileCraft.id],
    ["Vendor Admin", "admin@compilecraft.com", "555-333-1234", "Vendor Super Admin", compileCraft.id],
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
