"use server";

import { revalidatePath } from "next/cache";
import type { CheckInInput, KeyResultInput, ObjectiveInput, ObjectiveStatus } from "@/lib/agency/okr";
import { requireAuth, requirePermission } from "@/lib/permissions/check";
import {
  addCheckIn,
  addKeyResult,
  createObjective,
  deleteKeyResult,
  deleteObjective,
  duplicateObjective,
  setObjectiveStatus,
  updateKeyResult,
  updateObjective,
} from "@/lib/services/okr.service";

type Actor = Awaited<ReturnType<typeof requireAuth>>;

async function run(actor: () => Promise<Actor>, work: (user: Actor) => Promise<unknown>) {
  const user = await actor();
  try {
    await work(user);
    revalidatePath("/performance", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível salvar.",
    };
  }
}

const asManager = () => requirePermission("goals.manage");

export async function createObjectiveAction(input: ObjectiveInput) {
  return run(asManager, (user) => createObjective(user, input));
}

export async function updateObjectiveAction(id: string, input: ObjectiveInput) {
  return run(asManager, (user) => updateObjective(user, id, input));
}

export async function setObjectiveStatusAction(id: string, status: ObjectiveStatus) {
  return run(asManager, (user) => setObjectiveStatus(user, id, status));
}

export async function deleteObjectiveAction(id: string) {
  return run(asManager, (user) => deleteObjective(user, id));
}

export async function duplicateObjectiveAction(id: string) {
  return run(asManager, (user) => duplicateObjective(user, id));
}

export async function addKeyResultAction(objectiveId: string, input: KeyResultInput) {
  return run(asManager, (user) => addKeyResult(user, objectiveId, input));
}

export async function updateKeyResultAction(id: string, input: KeyResultInput) {
  return run(asManager, (user) => updateKeyResult(user, id, input));
}

export async function deleteKeyResultAction(id: string) {
  return run(asManager, (user) => deleteKeyResult(user, id));
}

/** Check-in: dono do objetivo ou gestão; o serviço confere quem é. */
export async function addCheckInAction(keyResultId: string, input: CheckInInput) {
  return run(requireAuth, (user) => addCheckIn(user, keyResultId, input));
}
