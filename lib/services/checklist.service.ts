import {
  AssignmentMethod,
  DemandOrigin,
  DemandStatus,
  DemandType,
  UserStatus,
} from "@prisma/client";
import { computeChecklistProgress } from "@/lib/agency/checklist-progress";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import { assignDemand } from "@/lib/services/assignment.service";
import type { SessionUser } from "@/types/auth";

export type AddChecklistItemInput = {
  title: string;
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

  const child = await db.demand.create({
    data: {
      title,
      type: DemandType.OTHER,
      origin:
        parent.origin === DemandOrigin.EXTRA
          ? DemandOrigin.EXTRA
          : DemandOrigin.CLIENT_BOARD,
      status: DemandStatus.OPEN,
      internalStatus: input.assigneeId
        ? "Atribuída"
        : "Item de checklist",
      boardColumn: "todo",
      isContractual: false,
      visibleToClient: false,
      isChecklistItem: true,
      checklistOrder,
      client: { connect: { id: parent.clientId } },
      parentDemand: { connect: { id: parent.id } },
      requester: { connect: { id: user.id } },
      ...(parent.boardId
        ? { board: { connect: { id: parent.boardId } } }
        : {}),
      ...(parent.competenceId
        ? { competence: { connect: { id: parent.competenceId } } }
        : {}),
      ...(sectorId ? { sector: { connect: { id: sectorId } } } : {}),
    },
  });

  if (input.assigneeId) {
    await assignDemand(
      child.id,
      input.assigneeId,
      user,
      AssignmentMethod.MANAGEMENT
    );
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

  if (child.sectorId !== assignee.sectorId) {
    await db.demand.update({
      where: { id: childId },
      data: { sector: { connect: { id: assignee.sectorId } } },
    });
  }

  await assignDemand(
    childId,
    assigneeId,
    user,
    AssignmentMethod.MANAGEMENT
  );

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
  if (!canEdit && !isAssignee) {
    throw new Error("Sem permissão para concluir este item");
  }

  if (
    child.status === DemandStatus.DONE ||
    child.status === DemandStatus.PUBLISHED ||
    child.status === DemandStatus.DELIVERED
  ) {
    return child;
  }

  return db.demand.update({
    where: { id: childId },
    data: {
      status: DemandStatus.DONE,
      internalStatus: "Concluída",
      boardColumn: "done",
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      sector: { select: { id: true, name: true } },
    },
  });
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
