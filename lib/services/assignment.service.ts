import {
  AssignmentMethod,
  AssignmentStatus,
  AuditAction,
  DemandStatus,
  NotificationType,
} from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";
import { recalculateSectorPriorities } from "@/lib/services/priority.service";
import type { SessionUser } from "@/types/auth";

export async function getActiveAssignment(demandId: string) {
  return db.demandAssignment.findFirst({
    where: {
      demandId,
      status: {
        in: [
          AssignmentStatus.AVAILABLE,
          AssignmentStatus.ASSIGNED,
          AssignmentStatus.IN_PROGRESS,
          AssignmentStatus.IN_REVIEW,
          AssignmentStatus.ADJUSTMENT,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      executor: { select: { id: true, name: true, avatarUrl: true } },
      sector: true,
    },
  });
}

export async function claimDemand(demandId: string, user: SessionUser) {
  const demand = await db.demand.findUnique({
    where: { id: demandId },
    include: { sector: true },
  });
  if (!demand) throw new Error("Demanda não encontrada");
  if (!demand.sectorId) throw new Error("Demanda sem setor");

  const assignment = await getActiveAssignment(demandId);
  if (!assignment) throw new Error("Nenhuma atribuição disponível");
  if (assignment.status !== AssignmentStatus.AVAILABLE && assignment.executorId) {
    throw new Error("Demanda já possui executor");
  }
  if (assignment.status === AssignmentStatus.IN_PROGRESS || assignment.status === AssignmentStatus.IN_REVIEW) {
    throw new Error("Demanda já está em andamento");
  }

  const updated = await db.demandAssignment.update({
    where: { id: assignment.id },
    data: {
      executorId: user.id,
      assignedById: user.id,
      assignedAt: new Date(),
      status: AssignmentStatus.ASSIGNED,
      method: AssignmentMethod.SELF,
    },
  });

  await db.demand.update({
    where: { id: demandId },
    data: {
      assigneeId: user.id,
      boardColumn: "assigned",
      status: DemandStatus.DEMANDED,
      internalStatus: "Atribuída",
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.DEMAND_CLAIMED,
    entityType: "Demand",
    entityId: demandId,
    newValue: { executorId: user.id, method: AssignmentMethod.SELF },
  });

  if (demand.requesterId && demand.requesterId !== user.id) {
    await createNotification({
      userId: demand.requesterId,
      type: NotificationType.DEMAND_ASSIGNED,
      title: "Demanda assumida",
      message: `${user.name} assumiu: ${demand.title}`,
      link: `/clientes/${demand.clientId}/quadro`,
    });
  }

  await recalculateSectorPriorities(demand.sectorId);
  return updated;
}

export async function assignDemand(
  demandId: string,
  executorId: string,
  user: SessionUser,
  method: AssignmentMethod = AssignmentMethod.MANAGEMENT
) {
  const demand = await db.demand.findUnique({ where: { id: demandId } });
  if (!demand) throw new Error("Demanda não encontrada");
  if (!demand.sectorId) throw new Error("Demanda sem setor");

  let assignment = await getActiveAssignment(demandId);
  if (!assignment) {
    assignment = await db.demandAssignment.create({
      data: {
        demandId,
        sectorId: demand.sectorId,
        executorId,
        assignedById: user.id,
        status: AssignmentStatus.ASSIGNED,
        method,
      },
      include: {
        executor: { select: { id: true, name: true, avatarUrl: true } },
        sector: true,
      },
    });
  } else {
    assignment = await db.demandAssignment.update({
      where: { id: assignment.id },
      data: {
        executorId,
        assignedById: user.id,
        assignedAt: new Date(),
        status: AssignmentStatus.ASSIGNED,
        method,
      },
      include: {
        executor: { select: { id: true, name: true, avatarUrl: true } },
        sector: true,
      },
    });
  }

  await db.demand.update({
    where: { id: demandId },
    data: {
      assigneeId: executorId,
      boardColumn: "assigned",
      status: DemandStatus.DEMANDED,
      internalStatus: "Atribuída",
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.DEMAND_ASSIGNED_SECTOR,
    entityType: "Demand",
    entityId: demandId,
    newValue: { executorId, method },
  });

  await createNotification({
    userId: executorId,
    type: NotificationType.DEMAND_ASSIGNED,
    title: "Demanda atribuída a você",
    message: demand.title,
    link: demand.sectorId
      ? (await db.sector.findUnique({ where: { id: demand.sectorId } }))?.slug === "video"
        ? "/painel/video"
        : "/painel/design"
      : "/gestao",
  });

  await recalculateSectorPriorities(demand.sectorId);
  return assignment;
}

export async function setScheduledExecution(
  demandId: string,
  scheduledAt: Date,
  user: SessionUser
) {
  const demand = await db.demand.findUnique({ where: { id: demandId } });
  if (!demand) throw new Error("Demanda não encontrada");

  const deadline = demand.demandDeadline ?? demand.dueDate;
  if (deadline && scheduledAt > deadline) {
    throw new Error("A data de execução não pode ultrapassar o prazo interno da demanda.");
  }

  const updated = await db.demand.update({
    where: { id: demandId },
    data: { scheduledExecutionAt: scheduledAt },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.DEMAND_UPDATED,
    entityType: "Demand",
    entityId: demandId,
    previousValue: { scheduledExecutionAt: demand.scheduledExecutionAt },
    newValue: { scheduledExecutionAt: scheduledAt },
  });

  return updated;
}
