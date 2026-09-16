"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions/check";
import { canAccessClient } from "@/lib/permissions/resolve";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import {
  addChecklistItem,
  assignChecklistItem,
  completeChecklistItem,
  getChecklistProgress,
  listChecklistItems,
} from "@/lib/services/checklist.service";

const addSchema = z.object({
  parentId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().trim().min(1, "Título é obrigatório.").max(160),
  assigneeId: z.string().optional(),
  sectorId: z.string().optional(),
});

export async function addChecklistItemAction(input: {
  parentId: string;
  clientId: string;
  title: string;
  assigneeId?: string;
  sectorId?: string;
}) {
  const user = await requireAuth();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const child = await addChecklistItem(user, parsed.data.parentId, {
      title: parsed.data.title,
      assigneeId: parsed.data.assigneeId || undefined,
      sectorId: parsed.data.sectorId || undefined,
    });
    revalidateOperationalViews(parsed.data.clientId);
    revalidatePath(`/clientes/${parsed.data.clientId}/quadro`);
    return { success: true as const, child };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o item.",
    };
  }
}

export async function assignChecklistItemAction(input: {
  childId: string;
  clientId: string;
  assigneeId: string;
}) {
  const user = await requireAuth();
  if (!input.childId || !input.assigneeId) {
    return { error: "Dados inválidos." };
  }

  try {
    const child = await assignChecklistItem(
      user,
      input.childId,
      input.assigneeId
    );
    revalidateOperationalViews(input.clientId);
    return { success: true as const, child };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível atribuir o item.",
    };
  }
}

export async function completeChecklistItemAction(input: {
  childId: string;
  clientId: string;
}) {
  const user = await requireAuth();
  if (!input.childId) {
    return { error: "Dados inválidos." };
  }

  try {
    const child = await completeChecklistItem(user, input.childId);
    revalidateOperationalViews(input.clientId);
    return { success: true as const, child };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o item.",
    };
  }
}

export async function listChecklistItemsAction(parentId: string) {
  const user = await requireAuth();
  if (!parentId) {
    return { error: "Demanda inválida." };
  }

  try {
    const parent = await db.demand.findUnique({
      where: { id: parentId },
      select: { clientId: true, isChecklistItem: true },
    });
    if (!parent || parent.isChecklistItem) {
      return { error: "Demanda não encontrada." };
    }
    if (!canAccessClient(user.permissions, user.clientIds, parent.clientId)) {
      return { error: "Sem permissão para este cliente." };
    }

    const items = await listChecklistItems(parentId);
    const progress = await getChecklistProgress(parentId);
    return { success: true as const, items, progress };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o checklist.",
    };
  }
}
