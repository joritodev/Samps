"use server";

import { requireAuth } from "@/lib/permissions/check";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { requestAdjustment } from "@/lib/services/adjustment.service";

export async function requestAdjustmentAction(
  demandId: string,
  clientId: string,
  description: string
) {
  const user = await requireAuth();
  try {
    await requestAdjustment(demandId, user, description);
    revalidateOperationalViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao solicitar ajuste" };
  }
}
