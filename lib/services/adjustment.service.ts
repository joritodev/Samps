import {
  AssignmentStatus,
  AuditAction,
  DemandStatus,
  NotificationType,
  WorkSessionStage,
} from "@prisma/client";
import { assertCanRequestAdjustment, canReviewDemand, DEMAND_ACTION_DENIED } from "@/lib/agency/labels";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";
import { getActiveAssignment } from "@/lib/services/assignment.service";
import { recalculateSectorPriorities } from "@/lib/services/priority.service";
import type { SessionUser } from "@/types/auth";

export async function requestAdjustment(
  demandId: string,
  user: SessionUser,
  description: string
) {
  if (!canReviewDemand(user.userType)) {
    throw new Error(DEMAND_ACTION_DENIED.review);
  }
  if (!description.trim()) throw new Error("Descrição do ajuste é obrigatória");

  const demand = await db.demand.findUnique({ where: { id: demandId } });
  if (!demand) throw new Error("Demanda não encontrada");
  assertCanRequestAdjustment(demand.status);

  const assignment = await getActiveAssignment(demandId);
  if (assignment) {
    await db.demandAssignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.ADJUSTMENT },
    });
  }

  await db.demand.update({
    where: { id: demandId },
    data: {
      status: DemandStatus.ADJUSTMENTS,
      internalStatus: "Ajuste solicitado",
      boardColumn: "adjustments",
    },
  });

  await db.comment.create({
    data: {
      demandId,
      userId: user.id,
      text: description,
      commentType: "ADJUSTMENT_REQUEST",
      visibility: "INTERNAL",
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.STATUS_CHANGED,
    entityType: "Demand",
    entityId: demandId,
    newValue: {
      status: DemandStatus.ADJUSTMENTS,
      stage: WorkSessionStage.ADJUSTMENT,
      description,
    },
  });

  const executorId = assignment?.executorId ?? demand.assigneeId;
  if (executorId) {
    await createNotification({
      userId: executorId,
      type: NotificationType.ADJUSTMENT_REQUESTED,
      title: "Ajuste solicitado",
      message: `${demand.title}: ${description}`,
      link: `/clientes/${demand.clientId}/quadro`,
    });
  }

  if (demand.sectorId) {
    await recalculateSectorPriorities(demand.sectorId);
  }

  return { success: true };
}
