"use server";

import {
  AuditAction,
  DemandOrigin,
  DemandStatus,
  DemandType,
  UserType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { logAudit } from "@/lib/services/audit.service";
import { db } from "@/lib/db";
import { createDemand } from "@/lib/services/demands.service";
import { refreshProject } from "@/lib/services/projects.service";

const createDemandSchema = z.object({
  clientId: z.string().min(1, "Selecione o cliente."),
  title: z.string().trim().min(3, "Título muito curto.").max(160),
  description: z.string().trim().max(4000).optional(),
  format: z.string().trim().max(80).optional(),
  sectorId: z.string().min(1).optional(),
  priorityId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  shootId: z.string().min(1).optional(),
  type: z.nativeEnum(DemandType).optional(),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(`${v}T12:00:00.000Z`) : undefined))
    .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
      message: "Prazo inválido.",
    }),
});

function originForActor(userType: UserType): DemandOrigin {
  switch (userType) {
    case UserType.SOCIAL_MEDIA:
      return DemandOrigin.SOCIAL_PANEL;
    case UserType.DESIGNER:
      return DemandOrigin.DESIGN_BOARD;
    case UserType.VIDEOMAKER:
    case UserType.VIDEO_EDITOR:
      return DemandOrigin.VIDEO_BOARD;
    default:
      return DemandOrigin.MANAGEMENT;
  }
}

export async function createDemandAction(input: {
  clientId: string;
  title: string;
  description?: string;
  format?: string;
  sectorId?: string;
  priorityId?: string;
  projectId?: string;
  shootId?: string;
  type?: DemandType;
  dueDate?: string;
}) {
  const actor = await requirePermission("demands.create");
  const parsed = createDemandSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (!hasPermission(actor.permissions, "demands.create")) {
    return { error: "Sem permissão para criar demanda." };
  }

  try {
    // Projeto e captação precisam ser do mesmo cliente, e o projeto não pode estar encerrado.
    if (parsed.data.projectId) {
      const project = await db.project.findUnique({
        where: { id: parsed.data.projectId },
        select: { clientId: true, status: true },
      });
      if (!project || project.clientId !== parsed.data.clientId) {
        return { error: "Projeto não encontrado para este cliente." };
      }
      if (project.status === "COMPLETED" || project.status === "CANCELLED") {
        return { error: "Este projeto está encerrado. Reabra-o para ligar demandas." };
      }
    }
    if (parsed.data.shootId) {
      const shoot = await db.shoot.findUnique({
        where: { id: parsed.data.shootId },
        select: { clientId: true, projectId: true },
      });
      if (!shoot || shoot.clientId !== parsed.data.clientId) {
        return { error: "Captação não encontrada para este cliente." };
      }
    }

    const row = await createDemand(actor, {
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      format: parsed.data.format || undefined,
      sectorId: parsed.data.sectorId || undefined,
      priorityId: parsed.data.priorityId || undefined,
      type: parsed.data.type ?? DemandType.OTHER,
      origin: originForActor(actor.userType),
      status: DemandStatus.PENDING_PLANNING,
      boardColumn: "todo",
      dueDate: parsed.data.dueDate,
      visibleToClient: false,
      projectId: parsed.data.projectId,
      shootId: parsed.data.shootId,
    });
    if (parsed.data.projectId) {
      await refreshProject(parsed.data.projectId);
      await logAudit({
        userId: actor.id,
        action: AuditAction.PROJECT_UPDATED,
        entityType: "Project",
        entityId: parsed.data.projectId,
        newValue: { description: `Demanda "${row.title}" criada no projeto` },
        origin: "demandas/criar",
      }).catch((e) => console.error("[projetos] histórico", e));
    }

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Demand",
      entityId: row.id,
      origin: "demandas/criar",
      newValue: {
        title: row.title,
        clientId: row.clientId,
        status: row.status,
        demandOrigin: row.origin,
        projectId: parsed.data.projectId ?? null,
        shootId: parsed.data.shootId ?? null,
      },
    });

    revalidateOperationalViews(row.clientId);
    if (parsed.data.projectId) revalidatePath(`/projetos/${parsed.data.projectId}`);
    if (parsed.data.shootId) revalidatePath(`/captacoes/${parsed.data.shootId}`);
    return { success: true, id: row.id };
  } catch (error) {
    console.error("createDemandAction", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível criar a demanda.",
    };
  }
}
