"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
import {
  createNextCompetence,
  setCurrentCompetence,
} from "@/lib/services/competence.service";

export async function switchCompetenceAction(
  boardId: string,
  clientId: string,
  competenceId: string
) {
  await requireAuth();
  await setCurrentCompetence(boardId, competenceId);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}

export async function createNextCompetenceAction(
  boardId: string,
  clientId: string,
  month: number,
  year: number
) {
  const user = await requireAuth();
  await createNextCompetence(boardId, month, year, user.id);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}
