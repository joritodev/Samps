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
  description: z.string().trim().max(4000).optional(),
  format: z.string().trim().max(80).optional(),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(`${v}T12:00:00.000Z`) : undefined))
    .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
      message: "Prazo inválido.",
    }),
  assigneeId: z.string().optional(),
  sectorId: z.string().optional(),
});

/**
 * Compat UI antiga até Task 4.
 * `parentId` no form antigo = demand pai; service novo espera `checklistId`.
 * Sem checklistId real, retorna erro pedindo Task 4 — evita create Demand pesado.
 */
export async function addChecklistItemAction(input: {
  parentId: string;
  clientId: string;
  title: string;
  description: string;
  format?: string;
  dueDate?: string;
  assigneeId?: string;
  sectorId?: string;
}) {
  const user = await requireAuth();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    // Task 4 rewrites this action to accept checklistId.
    // Temporary: treat parentId as checklistId only if a Checklist with that id exists.
    const asChecklist = await db.checklist.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true },
    });
    if (!asChecklist) {
      return {
        error:
          "Checklist Trello: use a nova action (Task 4). Lista ainda não migrada neste formulário.",
      };
    }

    let item = await addChecklistItem(
      user,
      parsed.data.parentId,
      parsed.data.title
    );
    if (parsed.data.assigneeId) {
      item = await assignChecklistItem(user, item.id, parsed.data.assigneeId);
    }
    revalidateOperationalViews(parsed.data.clientId);
    revalidatePath(`/clientes/${parsed.data.clientId}/quadro`);
    // Shape legado para UI até Task 4 (não reescrever demand-checklist).
    return {
      success: true as const,
      child: {
        id: item.id,
        title: item.title,
        description: null as string | null,
        format: null as string | null,
        status: item.isDone ? "DONE" : "OPEN",
        checklistOrder: item.sortOrder,
        dueDate: item.dueDate,
        assignee: null as { id?: string; name: string } | null,
      },
    };
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
    // Task 4: childId → itemId. Aceita ChecklistItem id.
    const item = await assignChecklistItem(
      user,
      input.childId,
      input.assigneeId
    );
    revalidateOperationalViews(input.clientId);
    return {
      success: true as const,
      child: {
        id: item.id,
        title: item.title,
        description: null as string | null,
        format: null as string | null,
        status: item.isDone ? "DONE" : "OPEN",
        checklistOrder: item.sortOrder,
        dueDate: item.dueDate,
        assignee: item.assigneeId
          ? { id: item.assigneeId, name: "" }
          : null,
      },
    };
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
