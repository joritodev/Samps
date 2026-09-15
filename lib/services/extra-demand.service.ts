import {
  AssignmentMethod,
  BoardListType,
  DemandOrigin,
  DemandStatus,
  DemandType,
  UserStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { canCreateExtraDemand } from "@/lib/permissions/can-create-extra-demand";
import { canAccessClient } from "@/lib/permissions/resolve";
import { assignDemand } from "@/lib/services/assignment.service";
import { boardColumnForList } from "@/types/board";
import type { SessionUser } from "@/types/auth";

export type CreateExtraDemandInput = {
  clientId: string;
  title: string;
  description?: string;
  sectorId: string;
  assigneeId: string;
  dueDate?: Date;
};

export async function createExtraDemand(
  user: SessionUser,
  input: CreateExtraDemandInput
) {
  if (!canAccessClient(user.permissions, user.clientIds, input.clientId)) {
    throw new Error("Sem permissão para este cliente");
  }

  if (!canCreateExtraDemand(user.permissions)) {
    throw new Error("Sem permissão para criar demanda avulsa");
  }

  const title = input.title.trim();
  if (!title) throw new Error("Título é obrigatório");
  if (!input.clientId) throw new Error("Cliente é obrigatório");
  if (!input.sectorId) throw new Error("Setor é obrigatório");
  if (!input.assigneeId) throw new Error("Responsável é obrigatório");

  const [sector, assignee, board] = await Promise.all([
    db.sector.findFirst({
      where: { id: input.sectorId, isActive: true },
      select: { id: true },
    }),
    db.user.findFirst({
      where: {
        id: input.assigneeId,
        status: UserStatus.ACTIVE,
        sectorId: input.sectorId,
      },
      select: { id: true },
    }),
    db.clientBoard.findUnique({
      where: { clientId: input.clientId },
      include: {
        lists: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);

  if (!sector) throw new Error("Setor inválido");
  if (!assignee) {
    throw new Error("Responsável inválido para o setor selecionado");
  }

  const extraList =
    board?.lists.find((l) => l.type === BoardListType.EXTRA) ??
    board?.lists.find((l) => /extra/i.test(l.name)) ??
    null;

  const competenceId = board?.currentCompetenceId ?? null;
  const boardId = board?.id ?? null;
  const listId = extraList?.id ?? null;
  const boardColumn = extraList
    ? boardColumnForList(extraList)
    : "todo";

  // Prisma create direto: createDemand exige demands.create e bloquearia
  // quem só tem demands.extra_create.
  const demand = await db.demand.create({
    data: {
      title,
      description: input.description?.trim() || undefined,
      type: DemandType.EXTRA,
      origin: DemandOrigin.EXTRA,
      status: DemandStatus.PENDING_PLANNING,
      internalStatus: "Pendente de atribuição",
      boardColumn,
      isContractual: false,
      visibleToClient: false,
      dueDate: input.dueDate,
      client: { connect: { id: input.clientId } },
      requester: { connect: { id: user.id } },
      sector: { connect: { id: input.sectorId } },
      ...(boardId ? { board: { connect: { id: boardId } } } : {}),
      ...(listId ? { list: { connect: { id: listId } } } : {}),
      ...(competenceId
        ? { competence: { connect: { id: competenceId } } }
        : {}),
    },
  });

  // AssignmentMethod não expõe SOCIAL; SOCIAL_MEDIA também usa MANAGEMENT.
  await assignDemand(
    demand.id,
    input.assigneeId,
    user,
    AssignmentMethod.MANAGEMENT
  );

  return demand.id;
}
