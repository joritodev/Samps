import { PortalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import { hasPermission } from "@/lib/permissions/resolve";

export interface PortalDemandDTO {
  id: string;
  title: string;
  type: string;
  status: string;
  externalStatus: string | null;
  deliveryDate: Date | null;
  publishDate: Date | null;
  format: string | null;
}

const INTERNAL_STATUSES = new Set([
  "PENDING_PLANNING",
  "DEMANDED",
  "IN_PRODUCTION",
  "IN_REVIEW",
  "ADJUSTMENTS",
]);

function mapExternalStatus(status: string, externalStatus: string | null) {
  if (externalStatus) return externalStatus;
  if (status === "PUBLISHED" || status === "DONE") return "Publicado";
  if (status === "IN_PRODUCTION" || status === "IN_REVIEW") return "Em produção";
  if (INTERNAL_STATUSES.has(status)) return "Planejamento";
  return "Em andamento";
}

export async function getPortalClientId(user: SessionUser) {
  return user.impersonatingClientId ?? user.clientIds[0] ?? null;
}

export async function getPortalForClient(clientId: string) {
  return db.clientPortal.findUnique({
    where: { clientId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          tradeName: true,
          logoUrl: true,
          brandColor: true,
          primaryResponsible: { select: { name: true, email: true } },
        },
      },
    },
  });
}

export async function getPortalOverview(user: SessionUser) {
  const clientId = await getPortalClientId(user);
  if (!clientId) return null;

  const portal = await getPortalForClient(clientId);
  if (!portal) return null;

  const isInternalPreview =
    user.userType !== "EXTERNAL_CLIENT" &&
    hasPermission(user.permissions, "portal.view_as_client");

  if (portal.status === PortalStatus.DRAFT && !isInternalPreview) {
    return null;
  }

  if (
    portal.status === PortalStatus.SUSPENDED ||
    portal.status === PortalStatus.ARCHIVED
  ) {
    if (!isInternalPreview) return null;
  }

  const config = (portal.config ?? {}) as {
    calendarEnabled?: boolean;
    completedVisible?: boolean;
    upcomingVisible?: boolean;
  };

  const demands = await db.demand.findMany({
    where: {
      clientId,
      visibleToClient: true,
      boardId: portal.boardId,
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      externalStatus: true,
      deliveryDate: true,
      publishDate: true,
      format: true,
      dueDate: true,
    },
    orderBy: { publishDate: "asc" },
  });

  const sanitized = demands.map(sanitizePortalDemand);
  const now = new Date();

  const planned = sanitized.filter((d) => d.status !== "DONE" && d.status !== "PUBLISHED").length;
  const inProgress = sanitized.filter((d) => d.status === "IN_PRODUCTION" || d.status === "IN_REVIEW").length;
  const delivered = sanitized.filter((d) => d.deliveryDate).length;
  const published = sanitized.filter((d) => d.status === "PUBLISHED" || d.status === "DONE").length;

  return {
    portal,
    client: {
      id: portal.client.id,
      name: portal.displayName || portal.client.tradeName || portal.client.name,
      logoUrl: portal.logoUrl ?? portal.client.logoUrl,
      brandColor: portal.primaryColor ?? portal.client.brandColor,
      primaryResponsible: portal.client.primaryResponsible,
    },
    config,
    isPreview: isInternalPreview && portal.status === PortalStatus.DRAFT,
    stats: {
      planned,
      inProgress,
      delivered,
      published,
      upcomingDeliveries: sanitized.filter((d) => d.deliveryDate && d.deliveryDate > now).length,
      upcomingPublications: sanitized.filter((d) => d.publishDate && d.publishDate > now).length,
    },
    demands: sanitized,
  };
}

export function sanitizePortalDemand(demand: {
  id: string;
  title: string;
  type: string;
  status: string;
  externalStatus?: string | null;
  deliveryDate: Date | null;
  publishDate: Date | null;
  format: string | null;
  dueDate?: Date | null;
}): PortalDemandDTO {
  return {
    id: demand.id,
    title: demand.title,
    type: demand.type,
    status: mapExternalStatus(demand.status, demand.externalStatus ?? null),
    externalStatus: demand.externalStatus ?? null,
    deliveryDate: demand.deliveryDate,
    publishDate: demand.publishDate,
    format: demand.format,
  };
}

export async function getPortalFiles(user: SessionUser) {
  const clientId = await getPortalClientId(user);
  if (!clientId) return [];

  const portal = await getPortalForClient(clientId);
  if (!portal) return [];
  if (portal.status === PortalStatus.DRAFT && user.userType === "EXTERNAL_CLIENT") {
    return [];
  }

  return db.attachment.findMany({
    where: { clientId, visibleToClient: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPortalCalendarDemands(user: SessionUser) {
  const overview = await getPortalOverview(user);
  if (!overview?.config.calendarEnabled) return [];
  return overview.demands.filter((d) => d.publishDate || d.deliveryDate);
}
