"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/permissions/check";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import {
  addChecklistItem,
  assignChecklistItem,
  completeChecklistItem,
  createChecklist,
  deleteChecklist,
  deleteChecklistItem,
  ensureChecklistItemDemand,
  renameChecklist,
  reorderChecklistItems,
  setChecklistItemDueDate,
  toggleChecklistItemDone,
  unassignChecklistItem,
  updateChecklistItemTitle,
} from "@/lib/services/checklist.service";

const createSchema = z.object({
  demandId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
});

const renameSchema = z.object({
  checklistId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
});

const deleteChecklistSchema = z.object({
  checklistId: z.string().min(1),
  clientId: z.string().min(1),
});

const addItemSchema = z.object({
  checklistId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
});

const updateItemTitleSchema = z.object({
  itemId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
});

const dueDateSchema = z.object({
  itemId: z.string().min(1),
  clientId: z.string().min(1),
  dueDate: z
    .union([z.string().trim().min(1), z.null()])
    .transform((v) => {
      if (v === null) return null;
      const d = new Date(`${v}T12:00:00.000Z`);
      return d;
    })
    .refine((d) => d === null || !Number.isNaN(d.getTime()), {
      message: "Prazo inválido.",
    }),
});

const assignSchema = z.object({
  itemId: z.string().min(1),
  clientId: z.string().min(1),
  assigneeId: z.string().min(1),
});

const itemClientSchema = z.object({
  itemId: z.string().min(1),
  clientId: z.string().min(1),
});

const toggleSchema = z.object({
  itemId: z.string().min(1),
  clientId: z.string().min(1),
  isDone: z.boolean(),
});

function actionError(error: unknown, fallback: string) {
  return {
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function createChecklistAction(input: {
  demandId: string;
  clientId: string;
  title?: string;
}) {
  const user = await requireAuth();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const checklist = await createChecklist(
      user,
      parsed.data.demandId,
      parsed.data.title
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, checklist };
  } catch (error) {
    return actionError(error, "Não foi possível criar o checklist.");
  }
}

export async function renameChecklistAction(input: {
  checklistId: string;
  clientId: string;
  title: string;
}) {
  const user = await requireAuth();
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const checklist = await renameChecklist(
      user,
      parsed.data.checklistId,
      parsed.data.title
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, checklist };
  } catch (error) {
    return actionError(error, "Não foi possível renomear o checklist.");
  }
}

export async function deleteChecklistAction(input: {
  checklistId: string;
  clientId: string;
}) {
  const user = await requireAuth();
  const parsed = deleteChecklistSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await deleteChecklist(user, parsed.data.checklistId);
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const };
  } catch (error) {
    return actionError(error, "Não foi possível apagar o checklist.");
  }
}

export async function addChecklistItemAction(input: {
  checklistId: string;
  clientId: string;
  title: string;
}) {
  const user = await requireAuth();
  const parsed = addItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const item = await addChecklistItem(
      user,
      parsed.data.checklistId,
      parsed.data.title
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, item };
  } catch (error) {
    return actionError(error, "Não foi possível adicionar o item.");
  }
}

export async function openChecklistItemAction(input: {
  itemId: string;
  clientId: string;
}) {
  const user = await requireAuth();
  const parsed = itemClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const opened = await ensureChecklistItemDemand(user, parsed.data.itemId);
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, demandId: opened.demandId };
  } catch (error) {
    return actionError(error, "Não foi possível abrir o item.");
  }
}

export async function updateChecklistItemTitleAction(input: {
  itemId: string;
  clientId: string;
  title: string;
}) {
  const user = await requireAuth();
  const parsed = updateItemTitleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const item = await updateChecklistItemTitle(
      user,
      parsed.data.itemId,
      parsed.data.title
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, item };
  } catch (error) {
    return actionError(error, "Não foi possível atualizar o título.");
  }
}

export async function setChecklistItemDueDateAction(input: {
  itemId: string;
  clientId: string;
  dueDate: string | null;
}) {
  const user = await requireAuth();
  const parsed = dueDateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const item = await setChecklistItemDueDate(
      user,
      parsed.data.itemId,
      parsed.data.dueDate
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, item };
  } catch (error) {
    return actionError(error, "Não foi possível atualizar o prazo.");
  }
}

export async function assignChecklistItemAction(input: {
  itemId: string;
  clientId: string;
  assigneeId: string;
}) {
  const user = await requireAuth();
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const item = await assignChecklistItem(
      user,
      parsed.data.itemId,
      parsed.data.assigneeId
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, item };
  } catch (error) {
    return actionError(error, "Não foi possível atribuir o item.");
  }
}

export async function unassignChecklistItemAction(input: {
  itemId: string;
  clientId: string;
}) {
  const user = await requireAuth();
  const parsed = itemClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const item = await unassignChecklistItem(user, parsed.data.itemId);
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, item };
  } catch (error) {
    return actionError(error, "Não foi possível remover o responsável.");
  }
}

export async function toggleChecklistItemDoneAction(input: {
  itemId: string;
  clientId: string;
  isDone: boolean;
}) {
  const user = await requireAuth();
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const item = await toggleChecklistItemDone(
      user,
      parsed.data.itemId,
      parsed.data.isDone
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const, item };
  } catch (error) {
    return actionError(error, "Não foi possível atualizar o item.");
  }
}

export async function deleteChecklistItemAction(input: {
  itemId: string;
  clientId: string;
}) {
  const user = await requireAuth();
  const parsed = itemClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await deleteChecklistItem(user, parsed.data.itemId);
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const };
  } catch (error) {
    return actionError(error, "Não foi possível apagar o item.");
  }
}

const reorderSchema = z.object({
  checklistId: z.string().min(1),
  clientId: z.string().min(1),
  orderedItemIds: z.array(z.string().min(1)).min(1),
});

export async function reorderChecklistItemsAction(input: {
  checklistId: string;
  clientId: string;
  orderedItemIds: string[];
}) {
  const user = await requireAuth();
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await reorderChecklistItems(
      user,
      parsed.data.checklistId,
      parsed.data.orderedItemIds
    );
    revalidateOperationalViews(parsed.data.clientId);
    return { success: true as const };
  } catch (error) {
    return actionError(error, "Não foi possível reordenar os itens.");
  }
}

/**
 * Compat: conclui demanda-filha legada / linked a partir do sheet do card.
 * Task 5 migra UI checklist; sheets de demanda-filha ainda usam Demand.id.
 */
export async function completeChecklistItemAction(input: {
  childId: string;
  clientId: string;
}) {
  const user = await requireAuth();
  if (!input.childId || !input.clientId) {
    return { error: "Dados inválidos." };
  }

  try {
    const child = await completeChecklistItem(user, input.childId);
    revalidateOperationalViews(input.clientId);
    return { success: true as const, child };
  } catch (error) {
    return actionError(error, "Não foi possível concluir o item.");
  }
}
