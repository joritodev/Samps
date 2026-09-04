"use server";

import {
  AuditAction,
  DemandOrigin,
  DemandStatus,
  DemandType,
  UserType,
} from "@prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { logAudit } from "@/lib/services/audit.service";
import { createDemand } from "@/lib/services/demands.service";

const createDemandSchema = z.object({
  clientId: z.string().min(1, "Selecione o cliente."),
  title: z.string().trim().min(3, "Título muito curto.").max(160),
  description: z.string().trim().max(4000).optional(),
  format: z.string().trim().max(80).optional(),
  sectorId: z.string().min(1).optional(),
  priorityId: z.string().min(1).optional(),
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
    });

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
      },
    });

    revalidateOperationalViews(row.clientId);
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
