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
  limit?: number;
}) {
  return db.auditLog.findMany({
    where: {
      entityType: params.entityType,
      entityId: params.entityId,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
  });
}
