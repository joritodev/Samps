"use server";

import { AuditAction, CommentType, DemandStatus, NotificationType } from "@prisma/client";
import { assertCanRequestAdjustment } from "@/lib/agency/labels";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { logAudit } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";

export async function aprovarDemanda(demandId: string) {
  const actor = await requirePermission("demands.edit");

  try {
    const previous = await db.demand.findUniqueOrThrow({
      where: { id: demandId },
      select: {
        status: true,
        title: true,
        clientId: true,
        client: { select: { socialMediaId: true } },
      },
    });

    if (previous.status !== DemandStatus.IN_REVIEW) {
      return {
        error:
          "Só é possível aprovar demandas em revisão. Status atual não permite esta ação.",
      };
    }

    await db.demand.update({
      where: { id: demandId },
      data: {
        status: DemandStatus.APPROVED,
        internalStatus: "Aprovado — aguardando publicação",
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGED,
      entityType: "Demand",
      entityId: demandId,
      previousValue: { status: previous.status },
      newValue: { status: DemandStatus.APPROVED },
    });

    if (
      previous.client.socialMediaId &&
      previous.client.socialMediaId !== actor.id
    ) {
      await createNotification({
        userId: previous.client.socialMediaId,
        type: NotificationType.OTHER,
        title: "Pronto para publicar",
        message: previous.title,
        link: "/meu-painel/social",
      });
    }

    revalidateOperationalViews(previous.clientId);
    return { success: true };
  } catch (error) {
    console.error("aprovarDemanda", error);
    return { error: "Não foi possível aprovar a demanda." };
  }
}

export async function solicitarAjuste(demandId: string, motivo: string) {
  const actor = await requirePermission("demands.edit");

  const note = motivo?.trim();
  if (!note) {
    return { error: "O motivo do ajuste é obrigatório." };
  }

  try {
    const previous = await db.demand.findUniqueOrThrow({
      where: { id: demandId },
      select: {
        status: true,
        title: true,
        clientId: true,
        assigneeId: true,
      },
    });
    assertCanRequestAdjustment(previous.status);

    await db.$transaction([
      db.demand.update({
        where: { id: demandId },
        data: { status: DemandStatus.ADJUSTMENTS },
      }),
      db.comment.create({
        data: {
          userId: actor.id,
          demandId,
          text: note,
          commentType: CommentType.ADJUSTMENT_REQUEST,
        },
      }),
    ]);

    await logAudit({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGED,
      entityType: "Demand",
      entityId: demandId,
      previousValue: { status: previous.status },
      newValue: { status: DemandStatus.ADJUSTMENTS, reason: note },
    });

    if (previous.assigneeId && previous.assigneeId !== actor.id) {
      await createNotification({
        userId: previous.assigneeId,
        type: NotificationType.ADJUSTMENT_REQUESTED,
        title: "Ajuste solicitado",
        message: `${previous.title}: ${note}`,
        link: `/clientes/${previous.clientId}/quadro`,
      });
    }

    revalidateOperationalViews(previous.clientId);
    return { success: true };
  } catch (error) {
    console.error("solicitarAjuste", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar o ajuste.",
    };
  }
}
