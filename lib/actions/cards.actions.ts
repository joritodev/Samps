"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
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

export async function getCardDetailAction(cardId: string) {
  const user = await requireAuth();
  const card = await getCardById(cardId);
  if (!card) return { error: "Cartão não encontrado" as const };

  const { listDemandDelaysForDemand } = await import(
    "@/lib/services/delay.service"
  );
  const delays = await listDemandDelaysForDemand(cardId);
  const canChangeDeadline = hasPermission(
    user.permissions,
    "demands.change_deadline"
  );

  return {
    card,
    canChangeDeadline,
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
  await completeProductionAndReview(cardId, user, materialUrl);
  revalidateOperationalViews(clientId);
  return { success: true };
}

export async function registerPublicationAction(
  cardId: string,
  clientId: string,
  data: { publishedUrl: string; publishedAt?: Date }
) {
  const user = await requireAuth();
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
  await requireAuth();
  await updateDemandListAndOrder(demandId, listId, sortOrder);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}

export async function updateVisibilityAction(
  cardId: string,
  clientId: string,
  visible: boolean,
  visibleFields?: string[]
) {
  const user = await requireAuth();
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
  await addCardComment(cardId, user.id, text, commentType);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}
