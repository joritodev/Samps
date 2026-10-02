"use server";

import { requireAuth } from "@/lib/permissions/check";
import { dismissDailySummary } from "@/lib/services/daily-summary.service";

export async function dismissDailySummaryAction() {
  const user = await requireAuth();
  try {
    await dismissDailySummary(user);
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível dispensar." };
  }
}
