"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
import type { AgendaMeetingInput } from "@/lib/agency/agenda-meeting";
import {
  createAgendaMeeting,
  deleteAgendaMeeting,
  updateAgendaMeeting,
} from "@/lib/services/agenda-meeting.service";

function fail(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Não foi possível salvar a reunião.",
  };
}

export async function createAgendaMeetingAction(input: AgendaMeetingInput) {
  const user = await requireAuth();
  try {
    await createAgendaMeeting(user, input);
    revalidatePath("/agenda");
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function updateAgendaMeetingAction(
  id: string,
  input: AgendaMeetingInput
) {
  const user = await requireAuth();
  try {
    await updateAgendaMeeting(user, id, input);
    revalidatePath("/agenda");
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAgendaMeetingAction(id: string) {
  const user = await requireAuth();
  try {
    await deleteAgendaMeeting(user, id);
    revalidatePath("/agenda");
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}
