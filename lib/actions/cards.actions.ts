"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions/check";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import {
  addCardComment,
  completeBriefingAndDemand,
  completeProductionAndReview,
  getCardById,
  registerPublicationAndComplete,
  updateCardVisibility,
  updateDemandListAndOrder,
} from "@/lib/services/cards.service";
import { notifyCommentMentions } from "@/lib/services/mentions.service";
import { listPriorities } from "@/lib/services/settings.service";

export async function getCardDetailAction(cardId: string) {
  const user = await requireAuth();
  const card = await getCardById(cardId);
  if (!card || !canAccessClient(user.permissions, user.clientIds, card.clientId)) {
    return { error: "Cartão não encontrado" as const };
  }

  const { listDemandDelaysForDemand } = await import(
    "@/lib/services/delay.service"
  );
  const delays = await listDemandDelaysForDemand(cardId);
  const canChangeDeadline = hasPermission(
    user.permissions,
    "demands.change_deadline"
  );
  const canEditChecklist = hasPermission(user.permissions, "demands.edit");
  const priorities = card.isChecklistItem
    ? (await listPriorities()).map((p) => ({ id: p.id, name: p.name }))
    : [];

  return {
    card,
    canChangeDeadline,
    canEditChecklist,
    priorities,
    delays: delays.map((d) => ({
      id: d.id,
      originalDueDate: d.originalDueDate.toISOString(),
      detectedAt: d.detectedAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      resolution: d.resolution,
      daysOverdue: d.daysOverdue,
    })),
  };
}

export async function demandBriefingAction(
  cardId: string,
  clientId: string,
  data: Parameters<typeof completeBriefingAndDemand>[2]
) {
  const user = await requireAuth();
  const guard = await guardDemand(user, cardId, { permission: "demands.edit" });
  if (!guard.ok) return { error: guard.error };
  try {
    await completeBriefingAndDemand(cardId, user, data);
    revalidateOperationalViews(clientId);
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao demandar briefing",
    };
  }
}

export async function completeProductionAction(
  cardId: string,
  clientId: string,
  materialUrl: string
) {
  const user = await requireAuth();
  const guard = await guardDemand(user, cardId, {
    permission: "demands.edit",
    who: "assignee",
    statuses: ["IN_PRODUCTION", "ADJUSTMENTS"],
    statusError: "Só dá para concluir a produção de demandas em produção ou em ajuste.",
  });
  if (!guard.ok) return { error: guard.error };
  try {
    await completeProductionAndReview(cardId, user, materialUrl);
    revalidateOperationalViews(clientId);
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao concluir produção",
    };
  }
}

export async function registerPublicationAction(
  cardId: string,
  clientId: string,
  data: { publishedUrl: string; publishedAt?: Date }
) {
  const user = await requireAuth();
  const guard = await guardDemand(user, cardId, { permission: "demands.edit" });
  if (!guard.ok) return { error: guard.error };
  try {
    await registerPublicationAndComplete(cardId, user, data);
    revalidateOperationalViews(clientId);
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao registrar publicação",
    };
  }
}

export async function moveCardAction(
  demandId: string,
  clientId: string,
  listId: string,
  sortOrder: number
) {
  const user = await requireAuth();
  const guard = await guardDemand(user, demandId, { permission: "demands.edit" });
  if (!guard.ok) return { error: guard.error };
  // A coluna precisa ser do quadro do cliente DONO da demanda, não do `clientId` enviado.
  const list = await db.boardList.findFirst({
    where: { id: listId, board: { clientId: guard.demand.clientId } },
    select: { id: true },
  });
  if (!list) {
    return { error: "Coluna não encontrada para este cliente" as const };
  }

  try {
    await updateDemandListAndOrder(demandId, listId, sortOrder);
    revalidatePath(`/clientes/${clientId}/quadro`);
    return { success: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível mover o cartão",
    };
  }
}

export async function updateVisibilityAction(
  cardId: string,
  clientId: string,
  visible: boolean,
  visibleFields?: string[]
) {
  const user = await requireAuth();
  const guard = await guardDemand(user, cardId, { permission: "demands.edit" });
  if (!guard.ok) return { error: guard.error };
  await updateCardVisibility(cardId, user, visible, visibleFields);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}

export async function addCommentAction(
  cardId: string,
  clientId: string,
  text: string,
  commentType?: "GENERAL" | "BRIEFING_CHANGE" | "ADJUSTMENT_REQUEST"
) {
  const user = await requireAuth();
  const guard = await guardDemand(user, cardId, { permission: "demands.edit" });
  if (!guard.ok) return { error: guard.error };
  if (typeof text !== "string" || !text.trim()) return { error: "Escreva o comentário." };
  await addCardComment(cardId, user.id, text.trim(), commentType);

  const demand = await db.demand.findUnique({
    where: { id: cardId },
    select: { title: true, clientId: true },
  });
  await notifyCommentMentions({
    text,
    authorUserId: user.id,
    authorName: user.name,
    demandTitle: demand?.title ?? "",
    clientId: demand?.clientId ?? clientId,
    demandId: cardId,
  });

  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}
