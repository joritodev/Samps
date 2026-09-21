import { AuditAction, DemandOrigin, DemandStatus, NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  assertCanRegisterPublication,
  BRIEFING_DEMAND_STATUSES,
} from "@/lib/agency/labels";
import { logAudit } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";
import {
  distributeDemandToSector,
  resolveSectorIdForDemand,
} from "@/lib/services/distribution.service";
import { completeWorkSession } from "@/lib/services/work-session.service";
import { resolveDelayOnTerminalStatus } from "@/lib/services/deadline.service";
import type { SessionUser } from "@/types/auth";
import { videoDemoMissingFields } from "@/lib/agency/video-demo-briefing";

const BRIEFING_REQUIRED = ["title", "description", "format"] as const;

export async function getCardById(id: string) {
  return db.demand.findUnique({
    where: { id },
    include: {
      client: true,
      board: true,
      list: true,
      competence: true,
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      requester: { select: { id: true, name: true } },
      priority: true,
      contentType: true,
      sector: true,
      contractService: true,
      parentDemand: { select: { id: true, title: true } },
      childDemands: {
        where: { isChecklistItem: true },
        orderBy: { checklistOrder: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          format: true,
          status: true,
          checklistOrder: true,
          dueDate: true,
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      checklists: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              assignee: true,
              linkedDemand: { select: { id: true, status: true } },
            },
          },
        },
      },
      comments: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          executor: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      workSessions: {
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
        take: 1,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
}

function computeDemoDeadlines(publishDate: Date) {
  const demandDeadline = new Date(publishDate);
  demandDeadline.setDate(demandDeadline.getDate() - 4);
  const dueDate = new Date(publishDate);
  dueDate.setDate(dueDate.getDate() - 2);
  return { demandDeadline, dueDate };
}

export async function completeBriefingAndDemand(
  cardId: string,
  user: SessionUser,
  data: {
    title: string;
    description: string;
    objective?: string;
    format?: string;
    priorityId?: string;
    sectorId?: string;
    publishDate?: Date;
    complexityLevel?: number;
    slidesCount?: number;
    screensCount?: number;
    durationSeconds?: number;
    orientation?: string;
  }
) {
  const card = await db.demand.findUnique({
    where: { id: cardId },
    include: { contentType: { select: { slug: true } } },
  });
  if (!card) throw new Error("Cartão não encontrado");
  if (card.briefingLockedAt) throw new Error("Briefing já bloqueado");
  if (!BRIEFING_DEMAND_STATUSES.includes(card.status)) {
    throw new Error(
      "Só é possível demandar cartões em planejamento. Status atual não permite esta ação."
    );
  }

  for (const field of BRIEFING_REQUIRED) {
    const value = data[field as keyof typeof data];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Campo obrigatório: ${field}`);
    }
  }

  const videoGaps = videoDemoMissingFields({
    contentTypeSlug: card.contentType?.slug,
    demandType: card.type,
    durationSeconds: data.durationSeconds ?? card.durationSeconds,
    format: data.format ?? card.format,
    orientation: data.orientation ?? card.orientation,
  });
  if (videoGaps.length) {
    throw new Error(
      `Briefing de vídeo (demo): preencha ${videoGaps.join(" e ")}.`
    );
  }

  const deadlines = data.publishDate
    ? computeDemoDeadlines(data.publishDate)
    : {};

  const sectorId =
    data.sectorId ??
    (await resolveSectorIdForDemand({
      sectorId: card.sectorId,
      format: data.format ?? card.format,
      type: card.type,
    }));

  if (!sectorId) {
    throw new Error("Setor responsável é obrigatório");
  }

  const updated = await db.demand.update({
    where: { id: cardId },
    data: {
      title: data.title,
      description: data.description,
      objective: data.objective as never,
      format: data.format,
      priorityId: data.priorityId,
      sectorId,
      publishDate: data.publishDate,
      complexityLevel: data.complexityLevel,
      slidesCount: data.slidesCount,
      screensCount: data.screensCount,
      durationSeconds: data.durationSeconds,
      orientation: data.orientation,
      ...deadlines,
      status: DemandStatus.DEMANDED,
      internalStatus: "Demandada",
      externalStatus: "Em preparação",
      briefingLockedAt: new Date(),
      briefingLockedById: user.id,
      requesterId: user.id,
      origin: DemandOrigin.CLIENT_BOARD,
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.BRIEFING_DEMANDED,
    entityType: "Demand",
    entityId: cardId,
    newValue: { status: DemandStatus.DEMANDED, sectorId },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.BRIEFING_LOCKED,
    entityType: "Demand",
    entityId: cardId,
  });

  await distributeDemandToSector({
    demandId: cardId,
    sectorId,
    actorId: user.id,
    title: updated.title,
    clientId: card.clientId,
  });

  const { linkDemandToClientSocial } = await import(
    "@/lib/services/social-board.service"
  );
  await linkDemandToClientSocial(cardId, card.clientId);

  if (card.assigneeId) {
    await createNotification({
      userId: card.assigneeId,
      type: NotificationType.DEMAND_ASSIGNED,
      title: "Nova demanda",
      message: updated.title,
      link: `/clientes/${card.clientId}/quadro`,
    });
  }

  return updated;
}

export async function completeProductionAndReview(
  cardId: string,
  user: SessionUser,
  materialUrl: string
) {
  return completeWorkSession(cardId, user, materialUrl);
}

export async function registerPublicationAndComplete(
  cardId: string,
  user: SessionUser,
  data: { publishedUrl: string; publishedAt?: Date }
) {
  if (!data.publishedUrl) throw new Error("Link de publicação é obrigatório");

  const card = await db.demand.findUnique({
    where: { id: cardId },
    select: {
      status: true,
      title: true,
      clientId: true,
      requesterId: true,
    },
  });
  if (!card) throw new Error("Cartão não encontrado");
  assertCanRegisterPublication(card.status);

  const updated = await db.demand.update({
    where: { id: cardId },
    data: {
      publishedUrl: data.publishedUrl,
      publishedAt: data.publishedAt ?? new Date(),
      status: DemandStatus.PUBLISHED,
      internalStatus: "Publicado",
      externalStatus: "Publicado",
      visibleToClient: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.PUBLICATION_REGISTERED,
    entityType: "Demand",
    entityId: cardId,
    newValue: { publishedUrl: data.publishedUrl },
  });

  if (card.requesterId && card.requesterId !== user.id) {
    await createNotification({
      userId: card.requesterId,
      type: NotificationType.OTHER,
      title: "Conteúdo publicado",
      message: card.title,
      link: `/clientes/${card.clientId}/quadro`,
    });
  }

  const managers = await db.user.findMany({
    where: {
      status: "ACTIVE",
      userType: { in: ["ADMIN", "MANAGEMENT"] },
    },
    select: { id: true },
    take: 10,
  });
  for (const m of managers) {
    if (m.id === user.id || m.id === card.requesterId) continue;
    await createNotification({
      userId: m.id,
      type: NotificationType.OTHER,
      title: "Conteúdo publicado",
      message: card.title,
      link: `/clientes/${card.clientId}/quadro`,
    });
  }

  await resolveDelayOnTerminalStatus(cardId, "PUBLISHED");

  return updated;
}

export async function updateCardVisibility(
  cardId: string,
  user: SessionUser,
  visible: boolean,
  visibleFields?: string[]
) {
  return db.demand.update({
    where: { id: cardId },
    data: {
      visibleToClient: visible,
      externalVisibleFields: visibleFields ?? [],
    },
  });
}

export async function updateDemandListAndOrder(
  demandId: string,
  listId: string,
  sortOrder: number
) {
  // Só listId/sortOrder: boardColumn guarda a etapa do ciclo/setor
  // (production, review…). O kanban do cliente agrupa por listId.
  return db.demand.update({
    where: { id: demandId },
    data: {
      listId,
      sortOrder,
    },
  });
}

export async function addCardComment(
  cardId: string,
  userId: string,
  text: string,
  commentType: "GENERAL" | "BRIEFING_CHANGE" | "ADJUSTMENT_REQUEST" = "GENERAL"
) {
  return db.comment.create({
    data: {
      demandId: cardId,
      userId,
      text,
      commentType,
      visibility: "INTERNAL",
    },
  });
}
