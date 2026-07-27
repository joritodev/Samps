"use server";

import { requireAuth } from "@/lib/permissions/check";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import {
  completeWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  startWorkSession,
} from "@/lib/services/work-session.service";

export async function startWorkSessionAction(demandId: string, clientId: string) {
  const user = await requireAuth();
  try {
    await startWorkSession(demandId, user);
    revalidateOperationalViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao iniciar" };
  }
}

export async function pauseWorkSessionAction(
  sessionId: string,
  clientId: string,
  reason: string,
  description?: string
) {
  const user = await requireAuth();
  try {
    await pauseWorkSession(sessionId, user, reason, description);
    revalidateOperationalViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao pausar" };
  }
}

export async function resumeWorkSessionAction(sessionId: string, clientId: string) {
  const user = await requireAuth();
  try {
    await resumeWorkSession(sessionId, user);
    revalidateOperationalViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao retomar" };
  }
}

export async function completeProductionSectorAction(
  demandId: string,
  clientId: string,
  materialUrl: string
) {
  const user = await requireAuth();
  try {
    await completeWorkSession(demandId, user, materialUrl);
    revalidateOperationalViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao concluir" };
  }
}
