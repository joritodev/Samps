"use server";

import { revalidatePath } from "next/cache";
import type { ShootStatus } from "@prisma/client";
import { requirePermission } from "@/lib/permissions/check";
import { addEditingDemand, changeShootStatus, createShoot, updateShoot } from "@/lib/services/shoots.service";

type Failure = { error: string };

function fail(error: unknown): Failure {
  return { error: error instanceof Error ? error.message : "Não foi possível concluir a ação." };
}

function refresh(id?: string) {
  revalidatePath("/captacoes");
  if (id) revalidatePath(`/captacoes/${id}`);
  revalidatePath("/projetos");
  revalidatePath("/demandas");
  revalidatePath("/planejamento-semanal/[setor]", "page");
}

export async function createShootAction(input: Record<string, unknown>) {
  const user = await requirePermission("shoots.create");
  try {
    const result = await createShoot(user, input);
    refresh(result.id);
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}

export async function updateShootAction(id: string, input: Record<string, unknown>) {
  const user = await requirePermission("shoots.create");
  try {
    await updateShoot(user, id, input);
    refresh(id);
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function changeShootStatusAction(id: string, status: ShootStatus, materialUrl?: string) {
  const user = await requirePermission("shoots.create");
  try {
    await changeShootStatus(user, id, status, { materialUrl });
    refresh(id);
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function addEditingDemandAction(shootId: string) {
  const user = await requirePermission("shoots.create");
  try {
    const result = await addEditingDemand(user, shootId);
    refresh(shootId);
    return { success: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}
