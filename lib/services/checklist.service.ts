import {
  AssignmentMethod,
  AssignmentStatus,
  DemandOrigin,
  DemandStatus,
  DemandType,
  UserStatus,
  WorkSessionStatus,
  type Checklist,
  type ChecklistItem,
} from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import { assignDemand } from "@/lib/services/assignment.service";
import { resolveDelayOnTerminalStatus } from "@/lib/services/deadline.service";
import { recalculateSectorPriorities } from "@/lib/services/priority.service";
import type { SessionUser } from "@/types/auth";

type ParentDemandSelect = {
  id: string;
  clientId: string;
  boardId: string | null;
  competenceId: string | null;
  type: DemandType;
  origin: DemandOrigin;
  isChecklistItem: boolean;
  status: DemandStatus;
};

async function assertCanEditParent(
  user: SessionUser,
  parentId: string
): Promise<ParentDemandSelect> {
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

async function loadChecklistForEdit(user: SessionUser, checklistId: string) {
  const checklist = await db.checklist.findUnique({
    where: { id: checklistId },
    include: {
      demand: {
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
      },
    },
  });
  if (!checklist) throw new Error("Checklist não encontrado");
  await assertCanEditParent(user, checklist.demandId);
  return checklist;
}

async function loadItem(itemId: string) {
  const item = await db.checklistItem.findUnique({
    where: { id: itemId },
    include: {
      checklist: {
        include: {
          demand: {
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
          },
        },
      },
    },
  });
  if (!item) throw new Error("Item de checklist não encontrado");
  return item;
}

async function loadItemForEdit(user: SessionUser, itemId: string) {
  const item = await loadItem(itemId);
  await assertCanEditParent(user, item.checklist.demandId);
  return item;
}

const TERMINAL_STATUSES: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.PUBLISHED,
  DemandStatus.DELIVERED,
];

async function completeLinkedDemand(user: SessionUser, childId: string) {
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

  if (TERMINAL_STATUSES.includes(child.status)) {
    await syncLinkedChecklistItemDone(childId, true);
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

  await syncLinkedChecklistItemDone(childId, true);
  await resolveDelayOnTerminalStatus(childId, "DONE");
  if (child.sectorId) {
    await recalculateSectorPriorities(child.sectorId);
  }

  return updated;
}

/** Sync ChecklistItem.isDone for all items pointing at this linked demand. */
async function syncLinkedChecklistItemDone(
  linkedDemandId: string,
  isDone: boolean
) {
  await db.checklistItem.updateMany({
    where: { linkedDemandId },
    data: { isDone },
  });
}

/**
 * Auth for linked complete/reopen: demands.edit OR assignee OR sector leader.
 * Mirrors completeLinkedDemand gate (not demands.edit-only).
 */
async function assertCanActOnLinkedDemand(user: SessionUser, childId: string) {
  const child = await db.demand.findUnique({
    where: { id: childId },
    select: {
      id: true,
      clientId: true,
      assigneeId: true,
      isChecklistItem: true,
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

  return child;
}

async function reopenLinkedDemand(childId: string) {
  const child = await db.demand.findUnique({
    where: { id: childId },
    select: {
      id: true,
      assigneeId: true,
      status: true,
      sectorId: true,
    },
  });
  if (!child) return;

  if (!TERMINAL_STATUSES.includes(child.status)) {
    return;
  }

  // DemandStatus has no ASSIGNED — operational reopen: DEMANDED if assignee, else AVAILABLE
  const nextStatus = child.assigneeId
    ? DemandStatus.DEMANDED
    : DemandStatus.AVAILABLE;

  await db.demand.update({
    where: { id: childId },
    data: {
      status: nextStatus,
      boardColumn: child.assigneeId ? "assigned" : "available",
      internalStatus: child.assigneeId ? "Atribuída" : "Disponível no setor",
      productionCompletedAt: null,
    },
  });

  const assignment = await db.demandAssignment.findFirst({
    where: { demandId: childId },
    orderBy: { createdAt: "desc" },
  });

  if (assignment) {
    await db.demandAssignment.update({
      where: { id: assignment.id },
      data: {
        status: child.assigneeId
          ? AssignmentStatus.ASSIGNED
          : AssignmentStatus.AVAILABLE,
      },
    });
  }

  await syncLinkedChecklistItemDone(childId, false);

  if (child.sectorId) {
    await recalculateSectorPriorities(child.sectorId);
  }
}

async function assertNoActiveProductionSession(demandId: string) {
  const session = await db.workSession.findFirst({
    where: {
      demandId,
      status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
    },
    select: { id: true },
  });
  if (session) {
    throw new Error(
      "Não é possível apagar: há sessão de produção ativa ou pausada na demanda ligada"
    );
  }
}

async function deleteLinkedDemandIfSafe(linkedDemandId: string | null) {
  if (!linkedDemandId) return;
  await assertNoActiveProductionSession(linkedDemandId);
  await db.demand.delete({ where: { id: linkedDemandId } });
}

export async function createChecklist(
  user: SessionUser,
  demandId: string,
  title = "Checklist"
): Promise<Checklist> {
  await assertCanEditParent(user, demandId);

  const trimmed = title.trim() || "Checklist";
  const maxOrder = await db.checklist.aggregate({
    where: { demandId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  return db.checklist.create({
    data: {
      demandId,
      title: trimmed,
      sortOrder,
    },
  });
}

export async function renameChecklist(
  user: SessionUser,
  checklistId: string,
  title: string
): Promise<Checklist> {
  await loadChecklistForEdit(user, checklistId);
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Título é obrigatório");

  return db.checklist.update({
    where: { id: checklistId },
    data: { title: trimmed },
  });
}

export async function deleteChecklist(
  user: SessionUser,
  checklistId: string
): Promise<void> {
  const checklist = await loadChecklistForEdit(user, checklistId);
  const items = await db.checklistItem.findMany({
    where: { checklistId: checklist.id },
    select: { id: true, linkedDemandId: true },
  });

  const linkedIds = items
    .map((item) => item.linkedDemandId)
    .filter((id): id is string => Boolean(id));

  // Preflight all linked demands before deleting any
  for (const linkedId of linkedIds) {
    await assertNoActiveProductionSession(linkedId);
  }

  await db.$transaction(async (tx) => {
    for (const linkedId of linkedIds) {
      await tx.demand.delete({ where: { id: linkedId } });
    }
    await tx.checklist.delete({ where: { id: checklist.id } });
  });
}

export async function addChecklistItem(
  user: SessionUser,
  checklistId: string,
  title: string
): Promise<ChecklistItem> {
  await loadChecklistForEdit(user, checklistId);

  const trimmed = title.trim();
  if (!trimmed) throw new Error("Título é obrigatório");

  const maxOrder = await db.checklistItem.aggregate({
    where: { checklistId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  return db.checklistItem.create({
    data: {
      checklistId,
      title: trimmed,
      sortOrder,
    },
  });
}

export async function updateChecklistItemTitle(
  user: SessionUser,
  itemId: string,
  title: string
): Promise<ChecklistItem> {
  const item = await loadItemForEdit(user, itemId);
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Título é obrigatório");

  const updated = await db.checklistItem.update({
    where: { id: itemId },
    data: { title: trimmed },
  });

  if (item.linkedDemandId) {
    await db.demand.update({
      where: { id: item.linkedDemandId },
      data: { title: trimmed },
    });
  }

  return updated;
}

export async function setChecklistItemDueDate(
  user: SessionUser,
  itemId: string,
  dueDate: Date | null
): Promise<ChecklistItem> {
  const item = await loadItemForEdit(user, itemId);

  const updated = await db.checklistItem.update({
    where: { id: itemId },
    data: { dueDate },
  });

  if (item.linkedDemandId) {
    await db.demand.update({
      where: { id: item.linkedDemandId },
      data: { dueDate },
    });
  }

  return updated;
}

export async function assignChecklistItem(
  user: SessionUser,
  itemId: string,
  assigneeId: string
): Promise<ChecklistItem> {
  const item = await loadItemForEdit(user, itemId);
  const parent = item.checklist.demand;

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

  let linkedDemandId = item.linkedDemandId;

  if (!linkedDemandId) {
    // assignDemand uses global db (not tx-aware) — create then orphan-cleanup on fail
    const child = await db.demand.create({
      data: {
        title: item.title,
        description: item.title,
        type: parent.type ?? DemandType.OTHER,
        origin:
          parent.origin === DemandOrigin.EXTRA
            ? DemandOrigin.EXTRA
            : DemandOrigin.CLIENT_BOARD,
        status: DemandStatus.DEMANDED,
        internalStatus: "Atribuída",
        boardColumn: "assigned",
        isContractual: false,
        visibleToClient: false,
        isChecklistItem: true,
        client: { connect: { id: parent.clientId } },
        parentDemand: { connect: { id: parent.id } },
        requester: { connect: { id: user.id } },
        assignee: { connect: { id: assignee.id } },
        sector: { connect: { id: assignee.sectorId } },
        ...(parent.boardId
          ? { board: { connect: { id: parent.boardId } } }
          : {}),
        ...(parent.competenceId
          ? { competence: { connect: { id: parent.competenceId } } }
          : {}),
      },
    });
    linkedDemandId = child.id;

    try {
      await assignDemand(
        child.id,
        assignee.id,
        user,
        AssignmentMethod.MANAGEMENT
      );
      return await db.checklistItem.update({
        where: { id: itemId },
        data: {
          linkedDemandId,
          assigneeId: assignee.id,
        },
      });
    } catch (err) {
      await db.demand.delete({ where: { id: child.id } }).catch(() => undefined);
      throw err;
    }
  }

  await db.demand.update({
    where: { id: linkedDemandId },
    data: {
      sector: { connect: { id: assignee.sectorId } },
      assignee: { connect: { id: assignee.id } },
    },
  });
  await assignDemand(
    linkedDemandId,
    assignee.id,
    user,
    AssignmentMethod.MANAGEMENT
  );

  return db.checklistItem.update({
    where: { id: itemId },
    data: {
      linkedDemandId,
      assigneeId: assignee.id,
    },
  });
}

export async function unassignChecklistItem(
  user: SessionUser,
  itemId: string
): Promise<ChecklistItem> {
  const item = await loadItemForEdit(user, itemId);

  if (item.linkedDemandId) {
    await db.demand.update({
      where: { id: item.linkedDemandId },
      data: { assigneeId: null },
    });
  }

  return db.checklistItem.update({
    where: { id: itemId },
    data: { assigneeId: null },
  });
}

export async function toggleChecklistItemDone(
  user: SessionUser,
  itemId: string,
  isDone: boolean
): Promise<ChecklistItem> {
  const item = await loadItem(itemId);

  if (item.linkedDemandId && isDone) {
    // Spec §6: linked complete — demands.edit OR assignee OR sector leader
    await completeLinkedDemand(user, item.linkedDemandId);
  } else if (item.linkedDemandId && !isDone) {
    // Same auth as complete (not demands.edit-only via parent)
    await assertCanActOnLinkedDemand(user, item.linkedDemandId);
    await reopenLinkedDemand(item.linkedDemandId);
  } else {
    await assertCanEditParent(user, item.checklist.demandId);
  }

  return db.checklistItem.update({
    where: { id: itemId },
    data: { isDone },
  });
}

export async function deleteChecklistItem(
  user: SessionUser,
  itemId: string
): Promise<void> {
  const item = await loadItemForEdit(user, itemId);
  await deleteLinkedDemandIfSafe(item.linkedDemandId);
  await db.checklistItem.delete({ where: { id: itemId } });
}

export async function listChecklistsForDemand(demandId: string) {
  return db.checklist.findMany({
    where: { demandId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          linkedDemand: { select: { id: true, status: true } },
        },
      },
    },
  });
}

export async function reorderChecklistItems(
  user: SessionUser,
  checklistId: string,
  orderedItemIds: string[]
): Promise<void> {
  const checklist = await db.checklist.findUnique({
    where: { id: checklistId },
    select: {
      id: true,
      demandId: true,
      items: { select: { id: true } },
    },
  });
  if (!checklist) throw new Error("Checklist não encontrado");
  await assertCanEditParent(user, checklist.demandId);

  const existing = new Set(checklist.items.map((item) => item.id));
  if (
    orderedItemIds.length !== existing.size ||
    !orderedItemIds.every((id) => existing.has(id))
  ) {
    throw new Error("Ordem inválida");
  }

  await db.$transaction(
    orderedItemIds.map((id, index) =>
      db.checklistItem.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
}

/** Conclui demanda-filha legada / linked (sheet do filho). */
export async function completeChecklistItem(
  user: SessionUser,
  childId: string
) {
  return completeLinkedDemand(user, childId);
}
