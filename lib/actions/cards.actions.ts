"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
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
  await requireAuth();
  const card = await getCardById(cardId);
  if (!card) return { error: "Cartão não encontrado" as const };
  return { card };
}

export async function demandBriefingAction(
  cardId: string,
  clientId: string,
  data: Parameters<typeof completeBriefingAndDemand>[2]
) {
  const user = await requireAuth();
  await completeBriefingAndDemand(cardId, user, data);
  revalidatePath(`/clientes/${clientId}/quadro`);
  revalidatePath("/quadros/design");
  revalidatePath("/quadros/video");
  revalidatePath("/painel/design");
  revalidatePath("/painel/video");
  revalidatePath("/gestao");
  return { success: true };
}

export async function completeProductionAction(
  cardId: string,
  clientId: string,
  materialUrl: string
) {
  const user = await requireAuth();
  await completeProductionAndReview(cardId, user, materialUrl);
  revalidatePath(`/clientes/${clientId}/quadro`);
  revalidatePath("/quadros/design");
  revalidatePath("/quadros/video");
  revalidatePath("/painel/design");
  revalidatePath("/painel/video");
  revalidatePath("/gestao");
  return { success: true };
}

export async function registerPublicationAction(
  cardId: string,
  clientId: string,
  data: { publishedUrl: string; publishedAt?: Date }
) {
  const user = await requireAuth();
  await registerPublicationAndComplete(cardId, user, data);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
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
