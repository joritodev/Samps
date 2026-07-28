"use server";

import { revalidateOperationalViews } from "@/lib/revalidate-operational";import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  changeDemandDeadline as changeDeadlineService,
  type DeadlineField,
} from "@/lib/services/deadline.service";
export async function changeDemandDeadlineAction(input: {
  demandId: string;
  clientId: string;
  field: DeadlineField;
  newDate: string;
  justification: string;
}) {
  const user = await requireAuth();
  if (!hasPermission(user.permissions, "demands.change_deadline")) {
    return { error: "Sem permissão para alterar prazo" as const };
  }

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
  await requireAuth();
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
