import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const accessSecret = process.env.JWT_SECRET || "dev-access-secret-change-me-32-chars";

export type AuthUser = {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  orgId: string;
  orgType: "Vendor" | "Utility";
};

async function userPayload(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    include: { role: true, organisation: true },
  });
  if (!user) throw new Error("Authentication required.");
  return {
    id: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions,
    orgId: user.organisationId,
    orgType: user.organisation.type,
  };
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw new Error("Authentication required.");
    const payload = jwt.verify(token, accessSecret) as jwt.JwtPayload;
    req.user = await userPayload(String(payload.sub));
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: "FORBIDDEN", message: "Authentication required." } });
  }
}
