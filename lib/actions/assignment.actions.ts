"use server";

import { AssignmentMethod } from "@prisma/client";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { db } from "@/lib/db";
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

  const demand = await db.demand.findUnique({
    where: { id: demandId },
    select: { sectorId: true, sector: { select: { leaderId: true } } },
  });
  if (!demand?.sectorId) {
    return { error: "Demanda sem setor." };
  }

  const isLeader = demand.sector?.leaderId === user.id;
  const canAssign =
    hasPermission(user.permissions, "demands.assign") || isLeader;
  if (!canAssign) {
    return { error: "Sem permissão para atribuir demanda." };
  }

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
