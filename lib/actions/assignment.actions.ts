"use server";

import { revalidatePath } from "next/cache";
import { AssignmentMethod } from "@prisma/client";
import { requireAuth } from "@/lib/permissions/check";
import {
  assignDemand,
  claimDemand,
  setScheduledExecution,
} from "@/lib/services/assignment.service";

function revalidateSectorViews(clientId?: string) {
  revalidatePath("/quadros/design");
  revalidatePath("/quadros/video");
  revalidatePath("/painel/design");
  revalidatePath("/painel/video");
  revalidatePath("/gestao");
  if (clientId) revalidatePath(`/clientes/${clientId}/quadro`);
}

export async function claimDemandAction(demandId: string, clientId: string) {
  const user = await requireAuth();
  try {
    await claimDemand(demandId, user);
    revalidateSectorViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao assumir" };
  }
}

export async function assignDemandAction(
  demandId: string,
  clientId: string,
  executorId: string,
  method: AssignmentMethod = AssignmentMethod.MANAGEMENT
) {
  const user = await requireAuth();
  try {
    await assignDemand(demandId, executorId, user, method);
    revalidateSectorViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atribuir" };
  }
}

export async function setScheduledExecutionAction(
  demandId: string,
  clientId: string,
  scheduledAt: string
) {
  const user = await requireAuth();
  try {
    await setScheduledExecution(demandId, new Date(scheduledAt), user);
    revalidateSectorViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao agendar" };
  }
}
