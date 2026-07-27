import { Prisma, UserStatus, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/credentials";
import { hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";
import { logAudit } from "./audit.service";
import { AuditAction } from "@prisma/client";

export async function listUsers(user: SessionUser, filters?: { search?: string; userType?: UserType }) {
  if (!hasPermission(user.permissions, "users.edit") && !hasPermission(user.permissions, "users.create")) {
    return [];
  }

  const where: Prisma.UserWhereInput = {};
  if (filters?.userType) where.userType = filters.userType;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return db.user.findMany({
    where,
    include: {
      role: true,
      sector: true,
      leader: { select: { id: true, name: true } },
      clientLinks: { include: { client: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createUser(
  actor: SessionUser,
  data: {
    name: string;
    email: string;
    userType: UserType;
    roleId: string;
    sectorId?: string;
    phone?: string;
    clientIds?: string[];
  }
) {
  if (!hasPermission(actor.permissions, "users.create")) {
    throw new Error("Sem permissão");
  }

  const tempPassword = await hashPassword("Temp@123456");
  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: tempPassword,
      userType: data.userType,
      roleId: data.roleId,
      sectorId: data.sectorId,
      phone: data.phone,
      status: UserStatus.INVITE_PENDING,
      mustResetPassword: true,
      clientLinks: data.clientIds?.length
        ? { create: data.clientIds.map((clientId) => ({ clientId })) }
        : undefined,
    },
  });

  await logAudit({
    userId: actor.id,
    action: AuditAction.USER_CREATED,
    entityType: "User",
    entityId: user.id,
    newValue: { email: user.email, userType: user.userType },
  });

  return user;
}

export async function completeFirstAccess(
  userId: string,
  data: { name: string; password: string; phone?: string; termsAccepted: boolean }
) {
  if (!data.termsAccepted) throw new Error("Termos devem ser aceitos");

  const passwordHash = await bcrypt.hash(data.password, 12);
  return db.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone,
      passwordHash,
      mustResetPassword: false,
      termsAcceptedAt: new Date(),
      status: UserStatus.ACTIVE,
    },
  });
}

export async function listTeam() {
  return db.user.findMany({
    where: {
      userType: { not: UserType.EXTERNAL_CLIENT },
      status: UserStatus.ACTIVE,
    },
    include: {
      role: true,
      sector: true,
      assignedDemands: {
        where: { status: { not: "DONE" } },
        take: 5,
        select: { id: true, title: true, status: true, dueDate: true },
      },
      clientLinks: { include: { client: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });
}
