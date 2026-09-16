"use server";

import { AuditAction } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/permissions/check";
import { canCreateExtraDemand } from "@/lib/permissions/can-create-extra-demand";
import { revalidateOperationalViews } from "@/lib/revalidate-operational";
import { logAudit } from "@/lib/services/audit.service";
import { createExtraDemand } from "@/lib/services/extra-demand.service";

const createExtraDemandSchema = z.object({
  clientId: z.string().min(1, "Cliente inválido."),
  title: z.string().trim().min(3, "Título muito curto.").max(160),
  description: z.string().trim().max(4000).optional(),
  sectorId: z.string().min(1, "Selecione o setor."),
  assigneeId: z.string().min(1, "Selecione o responsável."),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(`${v}T12:00:00.000Z`) : undefined))
    .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
      message: "Prazo inválido.",
    }),
});

export async function createExtraDemandAction(input: {
  clientId: string;
  title: string;
  description?: string;
  sectorId: string;
  assigneeId: string;
  dueDate?: string;
}) {
  const actor = await requireAuth();

  if (!canCreateExtraDemand(actor.permissions)) {
    return { error: "Sem permissão para criar demanda avulsa." };
  }

  const parsed = createExtraDemandSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const id = await createExtraDemand(actor, {
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      sectorId: parsed.data.sectorId,
      assigneeId: parsed.data.assigneeId,
      dueDate: parsed.data.dueDate,
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Demand",
      entityId: id,
      origin: "quadro/demanda-avulsa",
      newValue: {
        title: parsed.data.title,
        clientId: parsed.data.clientId,
        sectorId: parsed.data.sectorId,
        assigneeId: parsed.data.assigneeId,
        type: "EXTRA",
        origin: "EXTRA",
      },
    });

    revalidateOperationalViews(parsed.data.clientId);
    return { success: true, id };
  } catch (error) {
    console.error("createExtraDemandAction", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível criar a demanda avulsa.",
    };
  }
}
