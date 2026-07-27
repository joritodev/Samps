"use server";

import { revalidatePath } from "next/cache";
import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";

function revalidateBoards() {
  revalidatePath("/setores/design");
  revalidatePath("/demandas");
  revalidatePath("/meu-painel/social");
}

export async function aprovarDemanda(demandId: string) {
  try {
    await db.demand.update({
      where: { id: demandId },
      data: { status: DemandStatus.APPROVED },
    });
    revalidateBoards();
    return { success: true };
  } catch (error) {
    console.error("aprovarDemanda", error);
    return { error: "Não foi possível aprovar a demanda." };
  }
}

export async function solicitarAjuste(demandId: string, motivo: string) {
  const note = motivo?.trim();
  if (!note) {
    return { error: "O motivo do ajuste é obrigatório." };
  }

  try {
    const current = await db.demand.findUnique({
      where: { id: demandId },
      select: { description: true },
    });

    const base = current?.description?.trim() ?? "";
    const stamped = `${base}${base ? "\n\n" : ""}---\nAjuste solicitado:\n${note}`;

    await db.demand.update({
      where: { id: demandId },
      data: {
        status: DemandStatus.IN_ADJUSTMENT,
        description: stamped,
      },
    });

    revalidateBoards();
    return { success: true };
  } catch (error) {
    console.error("solicitarAjuste", error);
    return { error: "Não foi possível solicitar o ajuste." };
  }
}
