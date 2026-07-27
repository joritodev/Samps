"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
import {
  completeWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  startWorkSession,
} from "@/lib/services/work-session.service";

function revalidateSectorViews(clientId?: string) {
  revalidatePath("/quadros/design");
  revalidatePath("/quadros/video");
  revalidatePath("/painel/design");
  revalidatePath("/painel/video");
  revalidatePath("/gestao");
  if (clientId) revalidatePath(`/clientes/${clientId}/quadro`);
}

export async function startWorkSessionAction(demandId: string, clientId: string) {
  const user = await requireAuth();
  try {
    await startWorkSession(demandId, user);
    revalidateSectorViews(clientId);
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
    revalidateSectorViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao pausar" };
  }
}

export async function resumeWorkSessionAction(sessionId: string, clientId: string) {
  const user = await requireAuth();
  try {
    await resumeWorkSession(sessionId, user);
    revalidateSectorViews(clientId);
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
    revalidateSectorViews(clientId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao concluir" };
  }
}
