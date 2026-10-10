"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions/check";
import {
  changeProjectStatus,
  createProject,
  linkDemandToProject,
  listLinkableDemandsForProject,
  updateProject,
} from "@/lib/services/projects.service";

type Failure = { error: string };

function fail(error: unknown): Failure {
  return { error: error instanceof Error ? error.message : "Não foi possível concluir a ação." };
}

function refresh(id?: string) {
  revalidatePath("/projetos");
  if (id) revalidatePath(`/projetos/${id}`);
  revalidatePath("/demandas");
  revalidatePath("/captacoes");
}

export async function createProjectAction(input: Record<string, unknown>) {
  const user = await requirePermission("projects.create");
  try {
    const project = await createProject(user, input);
    refresh(project.id);
    return { success: true as const, id: project.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateProjectAction(id: string, input: Record<string, unknown>) {
  const user = await requirePermission("projects.create");
  try {
    await updateProject(user, id, input);
    refresh(id);
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function changeProjectStatusAction(
  id: string,
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
) {
  const user = await requirePermission("projects.create");
  try {
    await changeProjectStatus(user, id, status);
    refresh(id);
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function linkDemandToProjectAction(demandId: string, projectId: string | null) {
  const user = await requirePermission("projects.create");
  try {
    await linkDemandToProject(user, demandId, projectId);
    refresh(projectId ?? undefined);
    return { success: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function listLinkableDemandsAction(projectId: string) {
  const user = await requirePermission("projects.create");
  const rows = await listLinkableDemandsForProject(user, projectId);
  return rows.map((r) => ({ id: r.id, title: r.title, status: r.status, dueDate: r.dueDate?.toISOString() ?? null }));
}
