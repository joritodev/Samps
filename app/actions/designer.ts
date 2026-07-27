"use server";

import { revalidatePath } from "next/cache";
import { DemandStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Assumir demanda no quadro de Design.
 * Atualiza o mesmo registro Demand → aparece em "Em produção" no setor
 * e continua existindo no quadro do cliente (um registro, várias views).
 */
export async function assumirDemanda(demandId: string) {
  try {
    let assigneeId: string | undefined;

    const designer = await db.user.findFirst({
      where: { role: UserRole.DESIGNER },
      select: { id: true },
    });
    assigneeId = designer?.id;

    await db.demand.update({
      where: { id: demandId },
      data: {
        status: DemandStatus.IN_PRODUCTION,
        ...(assigneeId ? { assigneeId } : {}),
      },
    });

    revalidatePath("/setores/design");
    revalidatePath("/demandas");
    return { success: true };
  } catch (error) {
    console.error("assumirDemanda", error);
    return { error: "Não foi possível assumir a demanda." };
  }
}

/**
 * Finaliza produção do Design: exige link do material e envia para revisão.
 */
export async function concluirProducao(demandId: string, materialUrl: string) {
  const url = materialUrl?.trim();
  if (!url) {
    return { error: "O link do material é obrigatório" };
  }

  try {
    await db.demand.update({
      where: { id: demandId },
      data: {
        materialUrl: url,
        status: DemandStatus.IN_REVIEW,
      },
    });

    revalidatePath("/setores/design");
    revalidatePath("/demandas");
    return { success: true };
  } catch (error) {
    console.error("concluirProducao", error);
    return { error: "Não foi possível concluir a produção." };
  }
}
