import { DemandStatus, DemandType, DemandOrigin, Prisma, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";

export type DemandContext =
  | "client_board"
  | "board_list"
  | "social_panel"
  | "design_board"
  | "video_board"
  | "management"
  | "calendar"
  | "portal";

export interface DemandListFilters {
  context?: DemandContext;
  clientId?: string;
  boardId?: string;
  listId?: string;
  competenceId?: string;
  assigneeId?: string;
  status?: DemandStatus;
  boardColumn?: string;
  type?: DemandType;
  origin?: string;
  search?: string;
  visibleToClient?: boolean;
  overdue?: boolean;
  limit?: number;
}

const demandInclude = {
  client: { select: { id: true, name: true, brandColor: true } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  requester: { select: { id: true, name: true } },
  priority: { select: { id: true, name: true, color: true, weight: true } },
  contentType: { select: { id: true, name: true } },
  sector: { select: { id: true, name: true, slug: true, color: true } },
} satisfies Prisma.DemandInclude;

export function buildContextWhere(
  user: SessionUser,
  context: DemandContext
): Prisma.DemandWhereInput {
  const base: Prisma.DemandWhereInput = {};

  if (context === "portal") {
    const clientId = user.impersonatingClientId ?? user.clientIds[0];
    return {
      clientId,
      visibleToClient: true,
    };
  }

  if (!hasPermission(user.permissions, "clients.view_all")) {
    base.clientId = { in: user.clientIds };
  }

  switch (context) {
    case "client_board":
    case "board_list":
      return {
        ...base,
        origin: { in: [DemandOrigin.CLIENT_BOARD, DemandOrigin.MANAGEMENT] },
      };
    case "social_panel":
      return {
        ...base,
        OR: [
          { assigneeId: user.id },
          { requesterId: user.id },
          { client: { socialMediaId: user.id } },
        ],
      };
    case "design_board":
      return {
        ...base,
        OR: [
          { type: { in: [DemandType.DESIGN, DemandType.FEED, DemandType.STORY] } },
          { sector: { slug: "design" } },
        ],
      };
    case "video_board":
      return {
        ...base,
        OR: [
          { type: { in: [DemandType.VIDEO, DemandType.REEL] } },
          { sector: { slug: "video" } },
        ],
      };
    case "management":
      return base;
    case "calendar": {
      const isMgmt =
        user.userType === "ADMIN" || user.userType === "MANAGEMENT";
      if (isMgmt) return base;
      const scopeOr: Prisma.DemandWhereInput[] = [
        { assigneeId: user.id },
      ];
      if (user.sectorId) {
        scopeOr.push({ sectorId: user.sectorId });
      }
      return {
        ...base,
        OR: scopeOr,
      };
    }
    default:
      return base;
  }
}

export async function listDemands(user: SessionUser, filters: DemandListFilters = {}) {
  const context = filters.context ?? "management";
  const where: Prisma.DemandWhereInput = {
    ...buildContextWhere(user, context),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.boardId ? { boardId: filters.boardId } : {}),
    ...(filters.listId ? { listId: filters.listId } : {}),
    ...(filters.competenceId ? { competenceId: filters.competenceId } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.boardColumn ? { boardColumn: filters.boardColumn } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.visibleToClient !== undefined
      ? { visibleToClient: filters.visibleToClient }
      : {}),
    ...(filters.overdue
      ? {
          status: { not: DemandStatus.DONE },
          dueDate: { lt: new Date() },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (filters.clientId && !canAccessClient(user.permissions, user.clientIds, filters.clientId)) {
    return [];
  }

  return db.demand.findMany({
    where,
    include: demandInclude,
    orderBy: [{ priority: { weight: "desc" } }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: filters.limit,
  });
}

export async function getDemandById(user: SessionUser, id: string) {
  const demand = await db.demand.findUnique({
    where: { id },
    include: {
      ...demandInclude,
      comments: {
        where: user.userType === UserType.EXTERNAL_CLIENT
          ? { visibility: "EXTERNAL" }
          : undefined,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
    },
  });

  if (!demand) return null;
  if (!canAccessClient(user.permissions, user.clientIds, demand.clientId)) {
    if (user.userType === UserType.EXTERNAL_CLIENT && demand.visibleToClient) {
      return demand;
    }
    return null;
  }
  return demand;
}

export async function createDemand(
  user: SessionUser,
  data: {
    clientId: string;
    title: string;
    description?: string;
    type?: DemandType;
    origin?: DemandOrigin;
    format?: string;
    status?: DemandStatus;
    boardColumn?: string;
    dueDate?: Date;
    deliveryDate?: Date;
    publishDate?: Date;
    visibleToClient?: boolean;
    assigneeId?: string;
    priorityId?: string;
    sectorId?: string;
  }
) {
  if (!canAccessClient(user.permissions, user.clientIds, data.clientId)) {
    throw new Error("Sem permissão para este cliente");
  }

  if (!hasPermission(user.permissions, "demands.create")) {
    throw new Error("Sem permissão para criar demanda");
  }

  return db.demand.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type ?? DemandType.OTHER,
      origin: data.origin ?? DemandOrigin.MANAGEMENT,
      format: data.format,
      status: data.status ?? DemandStatus.PENDING_PLANNING,
      boardColumn: data.boardColumn ?? "todo",
      dueDate: data.dueDate,
      deliveryDate: data.deliveryDate,
      publishDate: data.publishDate,
      visibleToClient: data.visibleToClient ?? false,
      internalStatus: "Pendente de planejamento",
      client: { connect: { id: data.clientId } },
      ...(data.assigneeId
        ? { assignee: { connect: { id: data.assigneeId as string } } }
        : {}),
      requester: { connect: { id: user.id } },
      ...(data.priorityId
        ? { priority: { connect: { id: data.priorityId as string } } }
        : {}),
      ...(data.sectorId
        ? { sector: { connect: { id: data.sectorId as string } } }
        : {}),
    },
    include: demandInclude,
  });
}

export async function getDemandStats(user: SessionUser) {
  const where = buildContextWhere(user, "management");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [open, overdue, doneToday, doneWeek, doneMonth, unassigned, inProduction, activeProjects] =
    await Promise.all([
      db.demand.count({ where: { ...where, status: { not: DemandStatus.DONE } } }),
      db.demand.count({
        where: {
          ...where,
          status: { not: DemandStatus.DONE },
          dueDate: { lt: new Date() },
        },
      }),
      db.demand.count({
        where: { ...where, status: DemandStatus.DONE, updatedAt: { gte: today } },
      }),
      db.demand.count({
        where: { ...where, status: DemandStatus.DONE, updatedAt: { gte: weekAgo } },
      }),
      db.demand.count({
        where: { ...where, status: DemandStatus.DONE, updatedAt: { gte: monthAgo } },
      }),
      db.demand.count({
        where: { ...where, assigneeId: null, status: { not: DemandStatus.DONE } },
      }),
      db.demand.count({ where: { ...where, status: DemandStatus.IN_PRODUCTION } }),
      db.project.count({ where: { status: "ACTIVE" } }),
    ]);

  return {
    open,
    overdue,
    doneToday,
    doneWeek,
    doneMonth,
    unassigned,
    inProduction,
    activeProjects,
  };
}

export async function groupDemandsByColumn(
  user: SessionUser,
  context: DemandContext,
  filters: Omit<DemandListFilters, "context"> = {}
) {
  const demands = await listDemands(user, { ...filters, context });
  return demands.reduce<Record<string, typeof demands>>((acc, demand) => {
    const col = demand.boardColumn || "open";
    if (!acc[col]) acc[col] = [];
    acc[col].push(demand);
    return acc;
  }, {});
}
