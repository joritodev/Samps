import { AuditAction, UserType } from "@prisma/client";
import {
  parseDescriptionChange,
  parseReason,
  toDemandHistoryEntry,
  type DemandHistoryEntry,
} from "@/lib/agency/demand-history";
import { db } from "@/lib/db";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { logAudit } from "@/lib/services/audit.service";
import type { SessionUser } from "@/types/auth";

/** Linha do tempo do card: mudanças de prazo e de descrição, da mais recente para a mais antiga. */
export async function listDemandHistory(user: SessionUser, demandId: string): Promise<DemandHistoryEntry[]> {
  const guard = await guardDemand(user, demandId);
  if (!guard.ok) return [];
  const rows = await db.auditLog.findMany({
    where: {
      entityType: "Demand",
      entityId: demandId,
      action: { in: [AuditAction.DEADLINE_CHANGED, AuditAction.DEMAND_UPDATED] },
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(toDemandHistoryEntry).filter((e): e is DemandHistoryEntry => e !== null);
}

/** Qualquer pessoa com acesso à demanda edita a descrição; a versão anterior fica no histórico. */
export async function updateDemandDescription(
  user: SessionUser,
  demandId: string,
  description: unknown,
  reason?: unknown
) {
  if (user.userType === UserType.EXTERNAL_CLIENT) throw new Error("Sem permissão para esta ação.");
  const guard = await guardDemand(user, demandId);
  if (!guard.ok) throw new Error(guard.error);

  const current = await db.demand.findUnique({ where: { id: demandId }, select: { description: true } });
  if (!current) throw new Error("Demanda não encontrada.");

  const change = parseDescriptionChange(current.description, description);
  if (!change.ok) throw new Error(change.error);
  const note = parseReason(reason);

  await db.demand.update({ where: { id: demandId }, data: { description: change.value || null } });
  await logAudit({
    userId: user.id,
    action: AuditAction.DEMAND_UPDATED,
    entityType: "Demand",
    entityId: demandId,
    previousValue: { field: "description", value: current.description },
    newValue: { field: "description", previous: current.description, new: change.value, reason: note ?? "" },
    origin: "demand-description",
  });
  return { demandId };
}
