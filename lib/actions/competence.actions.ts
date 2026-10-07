"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
import { guardBoard } from "@/lib/permissions/demand-guard";
import {
  createNextCompetence,
  setCurrentCompetence,
} from "@/lib/services/competence.service";

export async function switchCompetenceAction(
  boardId: string,
  clientId: string,
  competenceId: string
) {
  const user = await requireAuth();
  const guard = await guardBoard(user, boardId);
  if (!guard.ok) return { error: guard.error };
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
  const guard = await guardBoard(user, boardId, { permission: "demands.create" });
  if (!guard.ok) return { error: guard.error };
  await createNextCompetence(boardId, month, year, user.id);
  revalidatePath(`/clientes/${clientId}/quadro`);
  return { success: true };
}
