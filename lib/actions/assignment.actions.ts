"use server";

import { AssignmentMethod } from "@prisma/client";
import { requireAuth } from "@/lib/permissions/check";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import {
  assignDemand,
  claimDemand,
  setScheduledExecution,
} from "@/lib/services/assignment.service";

export async function claimDemandAction(demandId: string, clientId: string) {
  const user = await requireAuth();
  try {
    await claimDemand(demandId, user);
    revalidateOperationalViews(clientId);
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
    revalidateOperationalViews(clientId);
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
    revalidateOperationalViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao agendar" };
  }
}
