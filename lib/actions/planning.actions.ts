"use server";

import { revalidatePath } from "next/cache";
import type { PlanCardInput, PlanCardMoveInput } from "@/lib/agency/planning/card-input";
import type {
  CapacityOverrideInput,
  MemberSettingsInput,
  PresetInput,
  TemplateInput,
} from "@/lib/agency/planning/config-input";
import type { IsoWeek, PlanTemplateData } from "@/lib/agency/planning/types";
import { requirePermission } from "@/lib/permissions/check";
import {
  applyDistribution,
  previewDistribution,
  type DistributionParams,
  type DistributionPreview,
} from "@/lib/services/planning-distribution.service";
import {
  addPlanMember,
  createPreset,
  deactivatePlanMember,
  deletePreset,
  duplicatePreviousWeek,
  listEligibleMembers,
  listPlanTemplates,
  saveClientTemplates,
  saveMemberSettings,
  setCapacityOverride,
  syncPlanWeek,
  toggleDayBlock,
} from "@/lib/services/planning-config.service";
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

/* ---- Configuração do quadro (planning.manage) ---- */

async function manage<T extends object>(work: (user: Awaited<ReturnType<typeof requirePermission>>) => Promise<T>) {
  const user = await requirePermission("planning.manage");
  try {
    const result = await work(user);
    refresh();
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}

export async function listEligibleMembersAction(
  slug: string,
): Promise<{ people: { id: string; name: string }[] } | Failure> {
  const user = await requirePermission("planning.manage");
  try {
    return { people: await listEligibleMembers(user, slug) };
  } catch (error) {
    return fail(error);
  }
}

export async function addPlanMemberAction(slug: string, userId: string, week: IsoWeek) {
  return manage(async (user) => {
    await addPlanMember(user, slug, userId, week);
    return {};
  });
}

export async function saveMemberSettingsAction(slug: string, week: IsoWeek, inputs: MemberSettingsInput[]) {
  return manage(async (user) => {
    await saveMemberSettings(user, slug, week, inputs);
    return {};
  });
}

export async function deactivatePlanMemberAction(slug: string, id: string, week: IsoWeek) {
  return manage(async (user) => {
    await deactivatePlanMember(user, slug, id, week);
    return {};
  });
}

export async function setCapacityOverrideAction(slug: string, week: IsoWeek, input: CapacityOverrideInput) {
  return manage(async (user) => {
    await setCapacityOverride(user, slug, week, input);
    return {};
  });
}

export async function toggleDayBlockAction(
  slug: string,
  week: IsoWeek,
  weekday: number,
  memberId: string | null,
) {
  return manage((user) => toggleDayBlock(user, slug, week, weekday, memberId));
}

export async function createPresetAction(slug: string, week: IsoWeek, input: PresetInput) {
  return manage(async (user) => {
    await createPreset(user, slug, week, input);
    return {};
  });
}

export async function deletePresetAction(slug: string, week: IsoWeek, id: string) {
  return manage(async (user) => {
    await deletePreset(user, slug, week, id);
    return {};
  });
}

export async function listPlanTemplatesAction(
  slug: string,
): Promise<{ templates: PlanTemplateData[] } | Failure> {
  const user = await requirePermission("planning.manage");
  try {
    return { templates: await listPlanTemplates(user, slug) };
  } catch (error) {
    return fail(error);
  }
}

export async function saveClientTemplatesAction(
  slug: string,
  week: IsoWeek,
  clientId: string,
  inputs: TemplateInput[],
) {
  return manage(async (user) => {
    await saveClientTemplates(user, slug, week, clientId, inputs);
    return {};
  });
}

/** Chamada ao abrir a semana: só atualiza a tela quando algo foi criado. */
export async function syncPlanWeekAction(slug: string, week: IsoWeek) {
  const user = await requirePermission("planning.manage");
  try {
    const result = await syncPlanWeek(user, slug, week);
    if (result.generated || result.duplicated) refresh();
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}

export async function duplicatePreviousWeekAction(slug: string, week: IsoWeek) {
  return manage((user) => duplicatePreviousWeek(user, slug, week));
}

/* ---- Distribuição automática (planning.edit) ---- */

export async function previewDistributionAction(
  slug: string,
  params: DistributionParams,
): Promise<{ preview: DistributionPreview } | { empty: true } | Failure> {
  const user = await requirePermission("planning.edit");
  try {
    const result = await previewDistribution(user, slug, params);
    return "empty" in result ? result : { preview: result };
  } catch (error) {
    return fail(error);
  }
}

export async function applyDistributionAction(
  slug: string,
  params: DistributionParams & { signature: string },
) {
  const user = await requirePermission("planning.edit");
  try {
    const result = await applyDistribution(user, slug, params);
    refresh();
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}
