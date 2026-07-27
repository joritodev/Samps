"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
import { requestAdjustment } from "@/lib/services/adjustment.service";

export async function requestAdjustmentAction(
  demandId: string,
  clientId: string,
  description: string
) {
  const user = await requireAuth();
  try {
    await requestAdjustment(demandId, user, description);
    revalidatePath(`/clientes/${clientId}/quadro`);
    revalidatePath("/quadros/design");
    revalidatePath("/quadros/video");
    revalidatePath("/quadros/trafego");
    revalidatePath("/quadros/social-media");
    revalidatePath("/painel/design");
    revalidatePath("/painel/video");
    revalidatePath("/painel/social-media");
    revalidatePath("/gestao");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao solicitar ajuste" };
  }
}
