"use server";

import { revalidatePath } from "next/cache";
import type { PlanCardInput, PlanCardMoveInput } from "@/lib/agency/planning/card-input";
import type { IsoWeek } from "@/lib/agency/planning/types";
import { requirePermission } from "@/lib/permissions/check";
import { listLinkableDemands, type LinkableDemand } from "@/lib/services/planning.service";
import {
  createPlanCard,
  deletePlanCard,
  duplicatePlanCard,
  listPlanningHistory,
  movePlanCard,
  movePlanCardToDate,
  togglePlanCardComplete,
  updatePlanCard,
  type PlanningHistoryEntry,
} from "@/lib/services/planning-cards.service";

type Failure = { error: string };

function fail(error: unknown): Failure {
  return { error: error instanceof Error ? error.message : "Não foi possível concluir a ação." };
}

function refresh() {
  revalidatePath("/planejamento-semanal/[setor]", "page");
}

/** Ações do quadro: `requirePermission` na porta; o serviço revalida e registra no histórico. */
export async function createPlanCardAction(slug: string, week: IsoWeek, input: PlanCardInput) {
  const user = await requirePermission("planning.edit");
  try {
    const result = await createPlanCard(user, slug, week, input);
    refresh();
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePlanCardAction(id: string, week: IsoWeek, input: PlanCardInput) {
  const user = await requirePermission("planning.edit");
  try {
    await updatePlanCard(user, id, week, input);
    refresh();
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function movePlanCardAction(input: PlanCardMoveInput) {
  const user = await requirePermission("planning.edit");
  try {
    await movePlanCard(user, input);
    refresh();
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function movePlanCardToDateAction(
  id: string,
  dateKey: string | null,
  memberId: string | null,
) {
  const user = await requirePermission("planning.edit");
  try {
    await movePlanCardToDate(user, id, dateKey, memberId);
    refresh();
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function togglePlanCardCompleteAction(id: string) {
  const user = await requirePermission("planning.edit");
  try {
    const result = await togglePlanCardComplete(user, id);
    refresh();
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}

export async function duplicatePlanCardAction(id: string, week: IsoWeek) {
  const user = await requirePermission("planning.edit");
  try {
    const result = await duplicatePlanCard(user, id, week);
    refresh();
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePlanCardAction(id: string) {
  const user = await requirePermission("planning.manage");
  try {
    await deletePlanCard(user, id);
    refresh();
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function listPlanningHistoryAction(
  slug: string,
  week: IsoWeek,
): Promise<{ entries: PlanningHistoryEntry[] } | Failure> {
  const user = await requirePermission("planning.view");
  try {
    return { entries: await listPlanningHistory(user, slug, week) };
  } catch (error) {
    return fail(error);
  }
}

export async function listLinkableDemandsAction(
  clientId: string,
): Promise<{ demands: LinkableDemand[] } | Failure> {
  const user = await requirePermission("planning.edit");
  try {
    return { demands: await listLinkableDemands(user, clientId) };
  } catch (error) {
    return fail(error);
  }
}
