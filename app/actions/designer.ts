"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { isHttpUrl, INVALID_URL_MESSAGE } from "@/lib/agency/url";
import { requireAuth, requirePermission } from "@/lib/permissions/check";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { logAudit } from "@/lib/services/audit.service";

/**
 * Assumir demanda no quadro do setor.
 * Atualiza o mesmo registro Demand → aparece em "Em produção" no setor
 * e continua existindo no quadro do cliente (um registro, várias views).
 */
export async function assumirDemanda(demandId: string) {
  const actor = await requireAuth();

  const guard = await guardDemand(actor, demandId, {
    permission: "demands.edit",
    who: "sector",
    statuses: [DemandStatus.DEMANDED, DemandStatus.AVAILABLE],
    statusError: "Só dá para assumir demandas disponíveis para o setor.",
  });
  if (!guard.ok) return { error: guard.error };

  try {
    const previous = await db.demand.findUniqueOrThrow({
      where: { id: demandId },
      select: { status: true, assigneeId: true },
    });

    if (previous.assigneeId && previous.assigneeId !== actor.id) {
      return { error: "Esta demanda já tem um responsável." };
    }

    await db.demand.update({
      where: { id: demandId },
      data: {
        status: DemandStatus.IN_PRODUCTION,
        assigneeId: actor.id,
        productionStartedAt: new Date(),
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.DEMAND_CLAIMED,
      entityType: "Demand",
      entityId: demandId,
      previousValue: previous,
      newValue: { status: DemandStatus.IN_PRODUCTION, assigneeId: actor.id },
    });

    revalidatePath("/setores", "layout");
    revalidatePath("/demandas");
    return { success: true };
  } catch (error) {
    console.error("assumirDemanda", error);
    return { error: "Não foi possível assumir a demanda." };
  }
}

/**
 * Finaliza produção do setor: exige link do material e envia para revisão.
 */
export async function concluirProducao(demandId: string, materialUrl: string) {
  const actor = await requirePermission("demands.edit");

  const url = materialUrl?.trim();
  if (!url) {
    return { error: "O link do material é obrigatório" };
  }
  if (!isHttpUrl(url)) return { error: INVALID_URL_MESSAGE };

  const guard = await guardDemand(actor, demandId, {
    permission: "demands.edit",
    who: "assignee",
    statuses: [DemandStatus.IN_PRODUCTION, DemandStatus.ADJUSTMENTS],
    statusError: "Só dá para concluir a produção de demandas em produção ou em ajuste.",
  });
  if (!guard.ok) return { error: guard.error };

  try {
    const previous = await db.demand.findUniqueOrThrow({
      where: { id: demandId },
      select: { status: true, materialUrl: true },
    });

    await db.demand.update({
      where: { id: demandId },
      data: {
        materialUrl: url,
        status: DemandStatus.IN_REVIEW,
        productionCompletedAt: new Date(),
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.PRODUCTION_COMPLETED,
      entityType: "Demand",
      entityId: demandId,
      previousValue: previous,
      newValue: { status: DemandStatus.IN_REVIEW, materialUrl: url },
    });

    revalidatePath("/setores", "layout");
    revalidatePath("/demandas");
    return { success: true };
  } catch (error) {
    console.error("concluirProducao", error);
    return { error: "Não foi possível concluir a produção." };
  }
}
