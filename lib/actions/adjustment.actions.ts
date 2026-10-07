"use server";

import { requireAuth } from "@/lib/permissions/check";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { requestAdjustment } from "@/lib/services/adjustment.service";

export async function requestAdjustmentAction(
  demandId: string,
  clientId: string,
  description: string
) {
  const user = await requireAuth();
  const guard = await guardDemand(user, demandId, { permission: "demands.edit" });
  if (!guard.ok) return { error: guard.error };
  try {
    await requestAdjustment(demandId, user, description);
    revalidateOperationalViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao solicitar ajuste" };
  }
}
