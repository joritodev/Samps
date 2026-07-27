"use server";

import { revalidatePath } from "next/cache";
import { DemandPriority, DemandStatus, WorkSector } from "@prisma/client";
import { db } from "@/lib/db";

const sectorMap: Record<string, WorkSector> = {
  social: WorkSector.SOCIAL,
  SOCIAL: WorkSector.SOCIAL,
  design: WorkSector.DESIGN,
  DESIGN: WorkSector.DESIGN,
  video: WorkSector.VIDEO,
  VIDEO: WorkSector.VIDEO,
  traffic: WorkSector.TRAFFIC,
  TRAFFIC: WorkSector.TRAFFIC,
};

const priorityMap: Record<string, DemandPriority> = {
  low: DemandPriority.LOW,
  LOW: DemandPriority.LOW,
  baixa: DemandPriority.LOW,
  medium: DemandPriority.MEDIUM,
  MEDIUM: DemandPriority.MEDIUM,
  média: DemandPriority.MEDIUM,
  media: DemandPriority.MEDIUM,
  high: DemandPriority.HIGH,
  HIGH: DemandPriority.HIGH,
  alta: DemandPriority.HIGH,
  urgent: DemandPriority.URGENT,
  URGENT: DemandPriority.URGENT,
  urgente: DemandPriority.URGENT,
};

export type ConcluirBriefingPayload = {
  description: string;
  sector: string;
  priority: string;
};

export async function concluirBriefing(
  demandId: string,
  payload: ConcluirBriefingPayload
) {
  const sector = sectorMap[payload.sector];
  const priority = priorityMap[payload.priority];

  if (!sector) {
    return { error: "Setor inválido." };
  }
  if (!priority) {
    return { error: "Prioridade inválida." };
  }

  try {
    await db.demand.update({
      where: { id: demandId },
      data: {
        description: payload.description,
        sector,
        priority,
        status: DemandStatus.AVAILABLE,
      },
    });

    revalidatePath("/demandas");
    revalidatePath("/setores/design");
    return { success: true };
  } catch (error) {
    console.error("concluirBriefing", error);
    return { error: "Não foi possível atualizar a demanda." };
  }
}
