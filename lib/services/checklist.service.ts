import {
  AssignmentStatus,
  DemandOrigin,
  DemandStatus,
  DemandType,
  UserStatus,
  WorkSessionStatus,
} from "@prisma/client";
import { computeChecklistProgress } from "@/lib/agency/checklist-progress";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import { resolveDelayOnTerminalStatus } from "@/lib/services/deadline.service";
import { distributeDemandToSector } from "@/lib/services/distribution.service";
import { recalculateSectorPriorities } from "@/lib/services/priority.service";
import type { SessionUser } from "@/types/auth";

export type AddChecklistItemInput = {
  title: string;
  description?: string;
  format?: string;
  dueDate?: Date;
  type?: DemandType;
  assigneeId?: string;
  sectorId?: string;
};

async function assertCanEditParent(user: SessionUser, parentId: string) {
  if (!hasPermission(user.permissions, "demands.edit")) {
    throw new Error("Sem permissão para editar demandas");
  }

  const parent = await db.demand.findUnique({
    where: { id: parentId },
    select: {
      id: true,
      clientId: true,
      boardId: true,
      competenceId: true,
      type: true,
      origin: true,
      isChecklistItem: true,
      status: true,
    },
  });

  if (!parent) throw new Error("Demanda não encontrada");
  if (parent.isChecklistItem) {
    throw new Error("Item de checklist não pode ter checklist");
  }
  if (!canAccessClient(user.permissions, user.clientIds, parent.clientId)) {
    throw new Error("Sem permissão para este cliente");
  }

  return parent;
}

export async function addChecklistItem(
  user: SessionUser,
  parentId: string,
  input: AddChecklistItemInput
) {
  const parent = await assertCanEditParent(user, parentId);

  const title = input.title.trim();
  if (!title) throw new Error("Título é obrigatório");

  let sectorId = input.sectorId;
  if (input.assigneeId) {
    const assignee = await db.user.findFirst({
      where: {
        id: input.assigneeId,
        status: UserStatus.ACTIVE,
        ...(sectorId ? { sectorId } : { sectorId: { not: null } }),
      },
      select: { id: true, sectorId: true },
    });
    if (!assignee?.sectorId) {
      throw new Error("Responsável inválido ou sem setor");
    }
    sectorId = assignee.sectorId;
  } else if (sectorId) {
    const sector = await db.sector.findFirst({
      where: { id: sectorId, isActive: true },
      select: { id: true },
    });
    if (!sector) throw new Error("Setor inválido");
  }

  const maxOrder = await db.demand.aggregate({
    where: { parentDemandId: parentId, isChecklistItem: true },
    _max: { checklistOrder: true },
  });
  const checklistOrder = (maxOrder._max.checklistOrder ?? 0) + 1;

  const description = input.description?.trim() || undefined;
  const format = input.format?.trim() || undefined;
  const demanded = Boolean(input.assigneeId || sectorId);

  const child = await db.demand.create({
    data: {
      title,
      description,
      format,
      type: input.type ?? parent.type ?? DemandType.OTHER,
      origin:
        parent.origin === DemandOrigin.EXTRA
          ? DemandOrigin.EXTRA
          : DemandOrigin.CLIENT_BOARD,
      status: demanded ? DemandStatus.DEMANDED : DemandStatus.OPEN,
      internalStatus: demanded
        ? "Disponível no setor"
        : "Item de checklist",
      boardColumn: demanded ? "available" : "todo",
      isContractual: false,
      visibleToClient: false,
      isChecklistItem: true,
      checklistOrder,
      dueDate: input.dueDate,
      client: { connect: { id: parent.clientId } },
      parentDemand: { connect: { id: parent.id } },
      requester: { connect: { id: user.id } },
      ...(input.assigneeId
        ? { assignee: { connect: { id: input.assigneeId } } }
        : {}),
      ...(parent.boardId
        ? { board: { connect: { id: parent.boardId } } }
        : {}),
      ...(parent.competenceId
        ? { competence: { connect: { id: parent.competenceId } } }
        : {}),
      ...(sectorId ? { sector: { connect: { id: sectorId } } } : {}),
    },
  });

  if (sectorId && demanded) {
    await distributeDemandToSector({
      demandId: child.id,
      sectorId,
      actorId: user.id,
      title,
      clientId: parent.clientId,
    });
  }

  return db.demand.findUniqueOrThrow({
    where: { id: child.id },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      sector: { select: { id: true, name: true } },
    },
  });
}

export async function assignChecklistItem(
  user: SessionUser,
  childId: string,
  assigneeId: string
) {
  const child = await db.demand.findUnique({
    where: { id: childId },
    select: {
      id: true,
      title: true,
      clientId: true,
      isChecklistItem: true,
      sectorId: true,
      sector: { select: { leaderId: true } },
    },
  });

  if (!child || !child.isChecklistItem) {
    throw new Error("Item de checklist não encontrado");
  }
  if (!canAccessClient(user.permissions, user.clientIds, child.clientId)) {
    throw new Error("Sem permissão para este cliente");
  }

  const isLeader = child.sector?.leaderId === user.id;
  const canAssign =
    hasPermission(user.permissions, "demands.assign") || isLeader;
  if (!canAssign) {
    throw new Error("Sem permissão para atribuir item de checklist");
  }

  const assignee = await db.user.findFirst({
    where: {
      id: assigneeId,
      status: UserStatus.ACTIVE,
      sectorId: { not: null },
    },
    select: { id: true, sectorId: true },
  });
  if (!assignee?.sectorId) {
    throw new Error("Responsável inválido ou sem setor");
  }

  const sectorId = assignee.sectorId;
  await db.demand.update({
    where: { id: childId },
    data: {
      sector: { connect: { id: sectorId } },
      assignee: { connect: { id: assignee.id } },
    },
  });

  await distributeDemandToSector({
    demandId: childId,
    sectorId,
    actorId: user.id,
    title: child.title,
    clientId: child.clientId,
  });

  return db.demand.findUniqueOrThrow({
    where: { id: childId },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      sector: { select: { id: true, name: true } },
    },
  });
}

export async function completeChecklistItem(
  user: SessionUser,
  childId: string
) {
  const child = await db.demand.findUnique({
    where: { id: childId },
    select: {
      id: true,
      clientId: true,
      assigneeId: true,
      isChecklistItem: true,
      status: true,
      sectorId: true,
      sector: { select: { leaderId: true } },
    },
  });

  if (!child || !child.isChecklistItem) {
    throw new Error("Item de checklist não encontrado");
  }
  if (!canAccessClient(user.permissions, user.clientIds, child.clientId)) {
    throw new Error("Sem permissão para este cliente");
  }

  const canEdit = hasPermission(user.permissions, "demands.edit");
  const isAssignee = child.assigneeId === user.id;
  const isLeader = child.sector?.leaderId === user.id;
  if (!canEdit && !isAssignee && !isLeader) {
    throw new Error("Sem permissão para concluir este item");
  }

  if (
    child.status === DemandStatus.DONE ||
    child.status === DemandStatus.PUBLISHED ||
    child.status === DemandStatus.DELIVERED
  ) {
    return child;
  }

  const assignment = await db.demandAssignment.findFirst({
    where: {
      demandId: childId,
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
  });

  if (assignment) {
    await db.demandAssignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.DONE },
    });
  }

  await db.workSession.updateMany({
    where: {
      demandId: childId,
      status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
    },
    data: { status: WorkSessionStatus.COMPLETED, endedAt: new Date() },
  });

  const updated = await db.demand.update({
    where: { id: childId },
    data: {
      status: DemandStatus.DONE,
      internalStatus: "Concluída",
      boardColumn: "done",
      productionCompletedAt: new Date(),
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      sector: { select: { id: true, name: true } },
    },
  });

  await resolveDelayOnTerminalStatus(childId, "DONE");
  if (child.sectorId) {
    await recalculateSectorPriorities(child.sectorId);
  }

  return updated;
}

export async function listChecklistItems(parentId: string) {
  return db.demand.findMany({
    where: { parentDemandId: parentId, isChecklistItem: true },
    orderBy: { checklistOrder: "asc" },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      sector: { select: { id: true, name: true } },
    },
  });
}

export async function getChecklistProgress(parentId: string) {
  const children = await db.demand.findMany({
    where: { parentDemandId: parentId, isChecklistItem: true },
    select: { status: true },
  });
  return computeChecklistProgress(children);
}
