import bcrypt from "bcryptjs";
import { AuditAction, UserStatus, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import { isLoginBlocked } from "@/lib/auth/rate-limit";
import {
  resolveUserClientIds,
  resolveUserPermissions,
} from "@/lib/permissions/resolve";
import { logAudit } from "@/lib/services/audit.service";

export async function validateCredentials(
  email: string,
  password: string,
  ipAddress?: string | null
) {
  const normalized = email.toLowerCase().trim();

  if (await isLoginBlocked(normalized, ipAddress)) {
    await db.accessAttemptLog.create({
      data: {
        email: normalized,
        ipAddress: ipAddress ?? null,
        success: false,
        reason: "rate_limited",
      },
    });
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: normalized },
    include: {
      role: true,
      sector: true,
    },
  });

  if (!user) {
    await db.accessAttemptLog.create({
      data: {
        email: normalized,
        ipAddress: ipAddress ?? null,
        success: false,
        reason: "user_not_found",
      },
    });
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await db.accessAttemptLog.create({
      data: {
        userId: user.id,
        email: normalized,
        ipAddress: ipAddress ?? null,
        success: false,
        reason: "invalid_password",
      },
    });
    return null;
  }

  if (user.status !== UserStatus.ACTIVE) {
    await db.accessAttemptLog.create({
      data: {
        userId: user.id,
        email: normalized,
        ipAddress: ipAddress ?? null,
        success: false,
        reason: "inactive_account",
      },
    });
    return null;
  }

  if (user.userType === UserType.EXTERNAL_CLIENT) {
    const clientIds = await resolveUserClientIds(user.id);
    if (clientIds.length === 0) {
      await db.accessAttemptLog.create({
        data: {
          userId: user.id,
          email: normalized,
          ipAddress: ipAddress ?? null,
          success: false,
          reason: "no_client_link",
        },
      });
      return null;
    }
  }

  const [permissions, clientIds] = await Promise.all([
    resolveUserPermissions(user.id),
    resolveUserClientIds(user.id),
  ]);

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await db.accessAttemptLog.create({
    data: {
      userId: user.id,
      email: normalized,
      ipAddress: ipAddress ?? null,
      success: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.LOGIN,
    entityType: "User",
    entityId: user.id,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    userType: user.userType,
    roleId: user.roleId,
    roleName: user.role.name,
    sectorId: user.sectorId,
    sectorName: user.sector?.name ?? null,
    status: user.status,
    avatarUrl: user.avatarUrl,
    mustResetPassword: user.mustResetPassword,
    permissions,
    clientIds,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
