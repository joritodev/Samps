"use server";

import { AbsenceKind, AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { logAudit } from "@/lib/services/audit.service";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS = 60;

const absenceSchema = z
  .object({
    userId: z.string().min(1),
    kind: z.nativeEnum(AbsenceKind),
    startsAt: z
      .string()
      .trim()
      .min(1)
      .transform((v) => new Date(`${v}T00:00:00.000Z`))
      .refine((d) => !Number.isNaN(d.getTime()), {
        message: "Data de início inválida.",
      }),
    endsAt: z
      .string()
      .trim()
      .min(1)
      .transform((v) => new Date(`${v}T00:00:00.000Z`))
      .refine((d) => !Number.isNaN(d.getTime()), {
        message: "Data de fim inválida.",
      }),
    note: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((data) => data.endsAt >= data.startsAt, {
    message: "O fim deve ser no mesmo dia ou depois do início.",
    path: ["endsAt"],
  })
  .refine(
    (data) =>
      data.endsAt.getTime() - data.startsAt.getTime() <= MAX_DAYS * MS_PER_DAY,
    {
      message: `O período máximo é de ${MAX_DAYS} dias.`,
      path: ["endsAt"],
    }
  );

function canManageOthers(permissions: string[]) {
  return hasPermission(permissions, "users.edit");
}

export async function createAbsence(input: {
  userId: string;
  kind: AbsenceKind;
  startsAt: string;
  endsAt: string;
  note?: string;
}) {
  const actor = await requireAuth();
  const parsed = absenceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (
    parsed.data.userId !== actor.id &&
    !canManageOthers(actor.permissions)
  ) {
    return { error: "Sem permissão para registrar ausência de outra pessoa." };
  }

  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!target) {
    return { error: "Membro não encontrado." };
  }

  try {
    const row = await db.absence.create({
      data: {
        userId: parsed.data.userId,
        kind: parsed.data.kind,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        note: parsed.data.note,
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Absence",
      entityId: row.id,
      origin: "equipe/ausencias",
      newValue: {
        userId: row.userId,
        kind: row.kind,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
      },
    });

    revalidatePath("/equipe");
    revalidatePath("/agenda");
    return { success: true, id: row.id };
  } catch (error) {
    console.error("createAbsence", error);
    return { error: "Não foi possível registrar a ausência." };
  }
}

export async function cancelAbsence(id: string) {
  const actor = await requireAuth();

  const row = await db.absence.findUnique({ where: { id } });
  if (!row || row.canceledAt) {
    return { error: "Ausência não encontrada." };
  }

  if (row.userId !== actor.id && !canManageOthers(actor.permissions)) {
    return { error: "Sem permissão para cancelar esta ausência." };
  }

  try {
    await db.absence.update({
      where: { id },
      data: { canceledAt: new Date() },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Absence",
      entityId: id,
      origin: "equipe/ausencias",
      newValue: { canceled: true },
    });

    revalidatePath("/equipe");
    revalidatePath("/agenda");
    return { success: true };
  } catch (error) {
    console.error("cancelAbsence", error);
    return { error: "Não foi possível cancelar a ausência." };
  }
}
