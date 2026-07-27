import { AssignmentStatus, AuditAction, DemandStatus, NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";
import { recalculateSectorPriorities } from "@/lib/services/priority.service";

const FORMAT_TO_SECTOR_SLUG: Record<string, string> = {
  estático: "design",
  estatico: "design",
  carrossel: "design",
  stories: "design",
  story: "design",
  infográfico: "design",
  infografico: "design",
  capa: "design",
  thumbnail: "design",
  pdf: "design",
  apresentação: "design",
  apresentacao: "design",
  reel: "video",
  vídeo: "video",
  video: "video",
  campanha: "trafego",
  anúncio: "trafego",
  anuncio: "trafego",
  tráfego: "trafego",
  trafego: "trafego",
  pixel: "trafego",
};

export async function resolveSectorIdForDemand(params: {
  sectorId?: string | null;
  format?: string | null;
  type?: string | null;
}) {
  if (params.sectorId) return params.sectorId;

  const key = (params.format ?? params.type ?? "").toLowerCase();
  const slug = FORMAT_TO_SECTOR_SLUG[key] ?? (
    params.type === "REEL" || params.type === "VIDEO" ? "video" :
    params.type === "FEED" || params.type === "STORY" || params.type === "DESIGN" ? "design" :
    null
  );

  if (!slug) {
    const design = await db.sector.findUnique({ where: { slug: "design" } });
    return design?.id ?? null;
  }

  const sector = await db.sector.findUnique({ where: { slug } });
  return sector?.id ?? null;
}

/** After briefing is demanded: create AVAILABLE assignment, notify sector, recalc Top 5 */
export async function distributeDemandToSector(params: {
  demandId: string;
  sectorId: string;
  actorId: string;
  title: string;
  clientId: string;
}) {
  const { demandId, sectorId, actorId, title, clientId } = params;

  await db.demand.update({
    where: { id: demandId },
    data: {
      sectorId,
      boardColumn: "available",
      status: DemandStatus.DEMANDED,
      internalStatus: "Disponível no setor",
    },
  });

  const existing = await db.demandAssignment.findFirst({
    where: { demandId, sectorId, status: { in: [AssignmentStatus.AVAILABLE, AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS] } },
  });

  if (!existing) {
    await db.demandAssignment.create({
      data: {
        demandId,
        sectorId,
        status: AssignmentStatus.AVAILABLE,
        assignedById: actorId,
      },
    });
  }

  await logAudit({
    userId: actorId,
    action: AuditAction.DEMAND_ASSIGNED_SECTOR,
    entityType: "Demand",
    entityId: demandId,
    newValue: { sectorId, status: AssignmentStatus.AVAILABLE },
  });

  const sectorUsers = await db.user.findMany({
    where: { sectorId, status: "ACTIVE" },
    select: { id: true },
    take: 20,
  });

  const sector = await db.sector.findUnique({ where: { id: sectorId } });
  const boardPath =
    sector?.slug === "video"
      ? "/quadros/video"
      : sector?.slug === "trafego"
        ? "/quadros/trafego"
        : "/quadros/design";

  for (const u of sectorUsers) {
    await createNotification({
      userId: u.id,
      type: NotificationType.NEW_DEMAND,
      title: "Nova demanda no setor",
      message: title,
      link: boardPath,
    });
  }

  // Notify client's social media
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { socialMediaId: true },
  });
  if (client?.socialMediaId && !sectorUsers.some((u) => u.id === client.socialMediaId)) {
    await createNotification({
      userId: client.socialMediaId,
      type: NotificationType.NEW_DEMAND,
      title: "Demanda enviada ao setor",
      message: title,
      link: `/clientes/${clientId}/quadro`,
    });
  }

  await recalculateSectorPriorities(sectorId);

  return { sectorId, boardPath, clientId };
}
