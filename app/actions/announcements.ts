"use server";

import { AnnouncementKind, AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";
import { logAudit } from "@/lib/services/audit.service";

const announcementSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    message: z.string().trim().min(3).max(1000),
    kind: z.nativeEnum(AnnouncementKind),
    startsAt: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? new Date(v) : new Date()))
      .refine((d) => !Number.isNaN(d.getTime()), { message: "Data de início inválida." }),
    endsAt: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? new Date(v) : null))
      .refine((d) => d === null || !Number.isNaN(d.getTime()), {
        message: "Data de fim inválida.",
      }),
  })
  .refine((data) => data.endsAt === null || data.endsAt >= data.startsAt, {
    message: "O fim da vigência deve ser posterior ao início.",
    path: ["endsAt"],
  });

export async function createAnnouncement(input: {
  title: string;
  message: string;
  kind: AnnouncementKind;
  startsAt?: string;
  endsAt?: string;
}) {
  const actor = await requirePermission("settings.access");
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const row = await db.announcement.create({
      data: {
        title: parsed.data.title,
        message: parsed.data.message,
        kind: parsed.data.kind,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        authorId: actor.id,
      },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Announcement",
      entityId: row.id,
      newValue: { title: row.title, kind: row.kind },
    });

    revalidatePath("/", "layout");
    revalidatePath("/configuracoes/avisos");
    return { success: true, id: row.id };
  } catch (error) {
    console.error("createAnnouncement", error);
    return { error: "Não foi possível criar o aviso." };
  }
}

export async function toggleAnnouncement(id: string, active: boolean) {
  const actor = await requirePermission("settings.access");

  try {
    const row = await db.announcement.update({
      where: { id },
      data: { active },
    });

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Announcement",
      entityId: row.id,
      newValue: { active },
    });

    revalidatePath("/", "layout");
    revalidatePath("/configuracoes/avisos");
    return { success: true };
  } catch (error) {
    console.error("toggleAnnouncement", error);
    return { error: "Não foi possível atualizar o aviso." };
  }
}

export async function deleteAnnouncement(id: string) {
  const actor = await requirePermission("settings.access");

  try {
    await db.announcement.delete({ where: { id } });

    await logAudit({
      userId: actor.id,
      action: AuditAction.OTHER,
      entityType: "Announcement",
      entityId: id,
      newValue: { deleted: true },
    });

    revalidatePath("/", "layout");
    revalidatePath("/configuracoes/avisos");
    return { success: true };
  } catch (error) {
    console.error("deleteAnnouncement", error);
    return { error: "Não foi possível remover o aviso." };
  }
}
