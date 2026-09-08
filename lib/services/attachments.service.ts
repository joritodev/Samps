import { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";

/** Anexa um link (Drive/Figma/etc.) — modelo demo até upload binário (3.2). */
export async function addDriveAttachment(input: {
  demandId: string;
  clientId: string;
  name: string;
  url: string;
  visibleToClient?: boolean;
  actorId: string;
}) {
  const demand = await db.demand.findUnique({
    where: { id: input.demandId },
    select: { id: true, clientId: true },
  });
  if (!demand) throw new Error("Demanda não encontrada");
  if (demand.clientId !== input.clientId) {
    throw new Error("Cliente da demanda não confere");
  }

  const row = await db.attachment.create({
    data: {
      demandId: input.demandId,
      clientId: input.clientId,
      name: input.name.trim(),
      url: input.url.trim(),
      fileType: "link",
      visibleToClient: input.visibleToClient ?? false,
      entityType: "Demand",
      entityId: input.demandId,
    },
  });

  await logAudit({
    userId: input.actorId,
    action: AuditAction.OTHER,
    entityType: "Attachment",
    entityId: row.id,
    origin: "attachments/drive-link",
    newValue: {
      demandId: input.demandId,
      name: row.name,
      visibleToClient: row.visibleToClient,
    },
  });

  return row;
}
