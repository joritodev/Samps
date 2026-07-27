"use server";

import { requireAuth } from "@/lib/permissions/check";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { registerPublicationAndComplete } from "@/lib/services/cards.service";

/** @deprecated Prefer registerPublicationAction — kept for any leftover callers. */
export async function publicarDemanda(demandId: string, postUrl: string) {
  const user = await requireAuth();
  const url = postUrl?.trim();
  if (!url) {
    return { error: "O link da publicação é obrigatório" };
  }

  try {
    const demand = await registerPublicationAndComplete(demandId, user, {
      publishedUrl: url,
    });
    revalidateOperationalViews(demand.clientId);
    return { success: true };
  } catch (error) {
    console.error("publicarDemanda", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a publicação.",
    };
  }
}
