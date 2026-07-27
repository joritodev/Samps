import { AuditAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function logAudit(params: {
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  origin?: string;
  ipAddress?: string;
}) {
  return db.auditLog.create({ data: params });
}

export async function listAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  since?: Date;
  limit?: number;
}) {
  return db.auditLog.findMany({
    where: {
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      action: params.action,
      createdAt: params.since ? { gte: params.since } : undefined,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
  });
}

/** Usuários que já aparecem no histórico — alimenta o filtro por autor. */
export async function listAuditActors() {
  const rows = await db.auditLog.findMany({
    where: { userId: { not: null } },
    distinct: ["userId"],
    select: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows
    .map((r) => r.user)
    .filter((u): u is { id: string; name: string } => Boolean(u))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
