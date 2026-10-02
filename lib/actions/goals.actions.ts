"use server";

import { revalidatePath } from "next/cache";
import type { GoalInput } from "@/lib/agency/goals";
import { requirePermission } from "@/lib/permissions/check";
import {
  createGoal,
  deleteGoal,
  setGoalActive,
  updateGoal,
} from "@/lib/services/goals.service";

function fail(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Não foi possível salvar a meta.",
  };
}

async function run(work: (user: Awaited<ReturnType<typeof requirePermission>>) => Promise<unknown>) {
  const user = await requirePermission("goals.manage");
  try {
    await work(user);
    revalidatePath("/performance", "layout");
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createGoalAction(input: GoalInput) {
  return run((user) => createGoal(user, input));
}

export async function updateGoalAction(id: string, input: GoalInput) {
  return run((user) => updateGoal(user, id, input));
}

export async function setGoalActiveAction(id: string, active: boolean) {
  return run((user) => setGoalActive(user, id, active));
}

export async function deleteGoalAction(id: string) {
  return run((user) => deleteGoal(user, id));
}
