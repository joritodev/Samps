"use server";

import { AuditAction, DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { BRIEFING_DEMAND_STATUSES } from "@/lib/agency/labels";
import { requirePermission } from "@/lib/permissions/check";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { logAudit } from "@/lib/services/audit.service";
import { distributeDemandToSector } from "@/lib/services/distribution.service";

export type ConcluirBriefingPayload = {
  description: string;
  /** Id ou slug do setor. */
  sector: string;
  /** Id ou nome do nível de prioridade. */
  priority: string;
};

export async function concluirBriefing(
  demandId: string,
  payload: ConcluirBriefingPayload
) {
  const actor = await requirePermission("demands.edit");

  const [sector, priority] = await Promise.all([
    db.sector.findFirst({
      where: { OR: [{ id: payload.sector }, { slug: payload.sector }] },
      select: { id: true, name: true },
    }),
    db.priorityLevel.findFirst({
      where: { OR: [{ id: payload.priority }, { name: payload.priority }] },
      select: { id: true, name: true },
    }),
  ]);

  if (!sector) return { error: "Setor inválido." };
  if (!priority) return { error: "Prioridade inválida." };

  try {
    const previous = await db.demand.findUniqueOrThrow({
      where: { id: demandId },
      select: {
        status: true,
        sectorId: true,
        priorityId: true,
        clientId: true,
        title: true,
        briefingLockedAt: true,
      },
    });

    if (previous.briefingLockedAt) {
      return { error: "Briefing já bloqueado." };
    }

    if (!BRIEFING_DEMAND_STATUSES.includes(previous.status)) {
      return {
        error:
          "Só é possível demandar cartões em planejamento. Status atual não permite esta ação.",
      };
    }

    await db.demand.update({
      where: { id: demandId },
      data: {
        description: payload.description,
        sectorId: sector.id,
        priorityId: priority.id,
        status: DemandStatus.DEMANDED,
        internalStatus: "Demandada",
        externalStatus: "Em preparação",
        briefingLockedAt: new Date(),
        briefingLockedById: actor.id,
        requesterId: actor.id,
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.BRIEFING_DEMANDED,
      entityType: "Demand",
      entityId: demandId,
      previousValue: previous,
      newValue: {
        status: DemandStatus.DEMANDED,
        sector: sector.name,
        priority: priority.name,
      },
    });

    await distributeDemandToSector({
      demandId,
      sectorId: sector.id,
      actorId: actor.id,
      clientId: previous.clientId,
      title: previous.title,
    });

    revalidateOperationalViews(previous.clientId);
    return { success: true };
  } catch (error) {
    console.error("concluirBriefing", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a demanda.",
    };
  }
}
