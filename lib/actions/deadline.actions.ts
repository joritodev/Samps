"use server";

import { revalidateOperationalViews } from "@/lib/revalidate-operational";import { requireAuth } from "@/lib/permissions/check";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { listDemandHistory, updateDemandDescription } from "@/lib/services/demand-history.service";
import {
  changeDemandDeadline as changeDeadlineService,
  type DeadlineField,
} from "@/lib/services/deadline.service";
export async function changeDemandDeadlineAction(input: {
  demandId: string;
  clientId: string;
  field: DeadlineField;
  newDate: string;
  justification?: string;
}) {
  const user = await requireAuth();

  const guard = await guardDemand(user, input.demandId);
  if (!guard.ok) return { error: guard.error };

  const parsed = new Date(input.newDate);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Data inválida" as const };
  }

  try {
    await changeDeadlineService(input.demandId, user, {
      field: input.field,
      newDate: parsed,
      justification: input.justification,
    });
    revalidateOperationalViews(input.clientId);
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao alterar prazo",
    };
  }
}

export async function listDemandDelaysAction(demandId: string) {
  const user = await requireAuth();
  const guard = await guardDemand(user, demandId);
  if (!guard.ok) return [];
  const { listDemandDelaysForDemand } = await import(
    "@/lib/services/delay.service"
  );
  const rows = await listDemandDelaysForDemand(demandId);
  return rows.map((r) => ({
    ...r,
    detectedAt: r.detectedAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    originalDueDate: r.originalDueDate.toISOString(),
  }));
}

export async function listDemandHistoryAction(demandId: string) {
  const user = await requireAuth();
  return listDemandHistory(user, demandId);
}

export async function updateDemandDescriptionAction(input: {
  demandId: string;
  clientId: string;
  description: string;
  reason?: string;
}) {
  const user = await requireAuth();
  try {
    await updateDemandDescription(user, input.demandId, input.description, input.reason);
    revalidateOperationalViews(input.clientId);
    return { success: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao salvar a descrição" };
  }
}
