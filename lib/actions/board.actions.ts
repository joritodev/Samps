"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PortalStatus } from "@prisma/client";
import { requireAuth, requireClientAccess } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { db } from "@/lib/db";
import {
  archiveBoard,
  archiveBoardList,
  createBoardList,
  createClientBoardTransaction,
  renameBoardList,
  reorderBoardLists,
  unarchiveBoardList,
} from "@/lib/services/board.service";
import type { BoardWizardInput } from "@/types/board";

export async function createBoardAction(input: BoardWizardInput) {
  const user = await requireAuth();
  if (!hasPermission(user.permissions, "clients.create")) {
    return { error: "Sem permissão" };
  }

  let result;
  try {
    result = await createClientBoardTransaction({
      ...input,
      createdById: user.id,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar quadro" };
  }

  revalidatePath("/clientes");
  revalidatePath("/gestao");
  redirect(`/clientes/${result.clientId}/quadro`);
}

export async function archiveBoardAction(boardId: string, clientId: string) {
  const user = await requireAuth();
  if (!hasPermission(user.permissions, "clients.edit")) {
    return { error: "Sem permissão" };
  }
  await archiveBoard(boardId, user.id);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}

export async function updateBoardSettingsAction(
  boardId: string,
  clientId: string,
  data: { name?: string }
) {
  const user = await requireAuth();
  if (!hasPermission(user.permissions, "clients.edit")) {
    return { error: "Sem permissão" };
  }
  await db.clientBoard.update({
    where: { id: boardId },
    data: { name: data.name },
  });
  revalidatePath(`/clientes/${clientId}/quadro/configuracoes`);
  return { success: true };
}

export async function updatePortalSettingsAction(
  portalId: string,
  clientId: string,
  data: {
    displayName?: string;
    status?: PortalStatus;
    calendarEnabled?: boolean;
    completedVisible?: boolean;
    upcomingVisible?: boolean;
  }
) {
  const user = await requireAuth();
  if (!hasPermission(user.permissions, "clients.edit")) {
    return { error: "Sem permissão" };
  }

  const portal = await db.clientPortal.findUnique({ where: { id: portalId } });
  const config = (portal?.config ?? {}) as Record<string, unknown>;

  await db.clientPortal.update({
    where: { id: portalId },
    data: {
      displayName: data.displayName,
      status: data.status,
      config: {
        ...config,
        calendarEnabled: data.calendarEnabled,
        completedVisible: data.completedVisible,
        upcomingVisible: data.upcomingVisible,
      },
    },
  });
  revalidatePath(`/clientes/${clientId}/quadro/configuracoes`);
  return { success: true };
}

async function requireBoardListManager(clientId: string) {
  const user = await requireClientAccess(clientId);
  if (!hasPermission(user.permissions, "boards.manage_lists")) {
    return {
      error: "Sem permissão para gerenciar colunas" as const,
      user: null,
    };
  }
  return { error: null, user };
}

function revalidateBoardPaths(clientId: string) {
  revalidatePath(`/clientes/${clientId}/quadro`);
  revalidatePath(`/clientes/${clientId}/quadro/configuracoes`);
}

export async function createBoardListAction(
  boardId: string,
  clientId: string,
  name: string
) {
  const { error, user } = await requireBoardListManager(clientId);
  if (error || !user) return { error: error ?? "Sem permissão" };

  try {
    const list = await createBoardList({
      boardId,
      clientId,
      name,
      userId: user.id,
    });
    revalidateBoardPaths(clientId);
    return { success: true, list: { id: list.id, name: list.name } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar coluna" };
  }
}

export async function renameBoardListAction(
  listId: string,
  clientId: string,
  name: string
) {
  const { error, user } = await requireBoardListManager(clientId);
  if (error || !user) return { error: error ?? "Sem permissão" };

  try {
    await renameBoardList({ listId, clientId, name, userId: user.id });
    revalidateBoardPaths(clientId);
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao renomear coluna",
    };
  }
}

export async function reorderBoardListsAction(
  boardId: string,
  clientId: string,
  orderedListIds: string[]
) {
  const { error, user } = await requireBoardListManager(clientId);
  if (error || !user) return { error: error ?? "Sem permissão" };

  try {
    await reorderBoardLists({
      boardId,
      clientId,
      orderedListIds,
      userId: user.id,
    });
    revalidateBoardPaths(clientId);
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao reordenar colunas",
    };
  }
}

export async function archiveBoardListAction(listId: string, clientId: string) {
  const { error, user } = await requireBoardListManager(clientId);
  if (error || !user) return { error: error ?? "Sem permissão" };

  try {
    await archiveBoardList({ listId, clientId, userId: user.id });
    revalidateBoardPaths(clientId);
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao arquivar coluna",
    };
  }
}

export async function unarchiveBoardListAction(
  listId: string,
  clientId: string
) {
  const { error, user } = await requireBoardListManager(clientId);
  if (error || !user) return { error: error ?? "Sem permissão" };

  try {
    await unarchiveBoardList({ listId, clientId, userId: user.id });
    revalidateBoardPaths(clientId);
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao restaurar coluna",
    };
  }
}
