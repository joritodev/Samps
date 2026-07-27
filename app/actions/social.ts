"use server";

import { revalidatePath } from "next/cache";
import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";

function revalidateSocialBoards() {
  revalidatePath("/meu-painel/social");
  revalidatePath("/setores/design");
  revalidatePath("/demandas");
}

export async function publicarDemanda(demandId: string, postUrl: string) {
  const url = postUrl?.trim();
  if (!url) {
    return { error: "O link da publicação é obrigatório" };
  }

  try {
    await db.demand.update({
      where: { id: demandId },
      data: {
        publishedUrl: url,
        status: DemandStatus.PUBLISHED,
      },
    });

    revalidateSocialBoards();
    return { success: true };
  } catch (error) {
    console.error("publicarDemanda", error);
    return { error: "Não foi possível registrar a publicação." };
  }
}
