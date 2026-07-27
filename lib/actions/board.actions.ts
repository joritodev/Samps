"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PortalStatus } from "@prisma/client";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { db } from "@/lib/db";
import {
  archiveBoard,
  createClientBoardTransaction,
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
