"use server";

import { DistributionMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions/check";
import {
  setCatalogActive,
  updateAgencySettings,
  upsertActivityStatus,
  upsertContentType,
  upsertPriority,
  upsertSector,
} from "@/lib/services/settings.service";

function revalidateSettings(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

export async function updateCompanySettingsAction(input: {
  name: string;
  logoUrl?: string;
  timezone: string;
  language: string;
  dateFormat: string;
  workStartTime: string;
  workEndTime: string;
  workDays: string;
}) {
  const user = await requirePermission("settings.access");
  if (!input.name.trim()) return { error: "Nome é obrigatório" as const };
  try {
    await updateAgencySettings(user.id, input);
    revalidateSettings("/configuracoes/empresa", "/configuracoes");
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao salvar",
    };
  }
}

export async function upsertSectorAction(input: {
  id?: string;
  name: string;
  slug?: string;
  color?: string;
  leaderId?: string | null;
  distributionMethod?: DistributionMethod;
  isActive?: boolean;
}) {
  const user = await requirePermission("settings.access");
  if (!input.name.trim()) return { error: "Nome é obrigatório" as const };
  try {
    await upsertSector(user.id, input);
    revalidateSettings("/configuracoes/setores", "/equipe", "/setores");
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao salvar setor",
    };
  }
}

export async function upsertContentTypeAction(input: {
  id?: string;
  name: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const user = await requirePermission("settings.access");
  if (!input.name.trim()) return { error: "Nome é obrigatório" as const };
  try {
    await upsertContentType(user.id, input);
    revalidateSettings("/configuracoes/tipos");
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao salvar tipo",
    };
  }
}

export async function upsertPriorityAction(input: {
  id?: string;
  name: string;
  color: string;
  weight?: number;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const user = await requirePermission("settings.access");
  if (!input.name.trim()) return { error: "Nome é obrigatório" as const };
  try {
    await upsertPriority(user.id, input);
    revalidateSettings("/configuracoes/prioridades");
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao salvar prioridade",
    };
  }
}

export async function upsertStatusAction(input: {
  id?: string;
  name: string;
  slug?: string;
  color?: string;
  sortOrder?: number;
  isFinal?: boolean;
  isActive?: boolean;
}) {
  const user = await requirePermission("settings.access");
  if (!input.name.trim()) return { error: "Nome é obrigatório" as const };
  try {
    await upsertActivityStatus(user.id, input);
    revalidateSettings("/configuracoes/status");
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao salvar status",
    };
  }
}

export async function toggleCatalogActiveAction(input: {
  kind: "sector" | "contentType" | "priority" | "status";
  id: string;
  isActive: boolean;
}) {
  const user = await requirePermission("settings.access");
  try {
    await setCatalogActive(user.id, input.kind, input.id, input.isActive);
    revalidateSettings(
      "/configuracoes/setores",
      "/configuracoes/tipos",
      "/configuracoes/prioridades",
      "/configuracoes/status"
    );
    return { success: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao atualizar",
    };
  }
}
