import {
  AssignmentStatus,
  DemandStatus,
  type Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getTop5ForSector } from "@/lib/services/priority.service";
import { formatElapsed } from "@/lib/services/work-session.service";
import { syncDemandDelays } from "@/lib/services/delay.service";

export type SectorSlug = "design" | "video" | "trafego";

export type SectorBoardMode = "sector" | "collaborator";

export type SectorBoardOptions = {
  mode?: SectorBoardMode;
  userId?: string;
  leaderFullView?: boolean;
  /** @deprecated use mode: "collaborator", userId */
  assigneeId?: string;
};

export const SECTOR_COLUMNS = [
  { id: "available", title: "Demandas disponíveis", statuses: [AssignmentStatus.AVAILABLE] },
  { id: "production", title: "Em produção", statuses: [AssignmentStatus.IN_PROGRESS, AssignmentStatus.ASSIGNED] },
  { id: "review", title: "Aguardando revisão", statuses: [AssignmentStatus.IN_REVIEW] },
  { id: "adjustments", title: "Ajustes", statuses: [AssignmentStatus.ADJUSTMENT] },
  { id: "done_today", title: "Concluídas hoje", statuses: [] as AssignmentStatus[] },
] as const;

const demandInclude = {
  client: { select: { id: true, name: true, brandColor: true } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  requester: { select: { id: true, name: true } },
  priority: { select: { id: true, name: true, color: true, weight: true } },
  sector: { select: { id: true, name: true, color: true, slug: true } },
  parentDemand: { select: { id: true, title: true } },
  assignments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      executor: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  workSessions: {
    where: { status: { in: ["ACTIVE" as const, "PAUSED" as const] } },
    take: 1,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
};

type DemandRow = Awaited<
  ReturnType<
    typeof db.demand.findMany<{ include: typeof demandInclude }>
  >
>[number];

type EnrichedDemand = ReturnType<typeof withTimerPreview<DemandRow>>;

function withTimerPreview<T extends {
  workSessions: {
    status: string;
    startedAt: Date;
    totalActiveSeconds: number;
    user: { id: string; name: string; avatarUrl: string | null };
  }[];
}>(demand: T) {
  const session = demand.workSessions[0];
  if (!session) return { ...demand, timerPreview: null };
  const elapsed =
    session.status === "ACTIVE"
      ? session.totalActiveSeconds +
        Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
      : session.totalActiveSeconds;
  return {
    ...demand,
    timerPreview: {
      status: session.status,
      startedAt: session.startedAt,
      executor: session.user,
      elapsedLabel: formatElapsed(elapsed),
    },
  };
}

function normalizeOptions(options?: SectorBoardOptions): SectorBoardOptions {
  if (!options) return { mode: "sector" };
  if (options.assigneeId && !options.userId) {
    return {
      ...options,
      mode: options.mode ?? "collaborator",
      userId: options.assigneeId,
    };
  }
  return options;
}

function buildSectorDemandWhere(
  sectorId: string,
  options?: SectorBoardOptions
): Prisma.DemandWhereInput {
  const base: Prisma.DemandWhereInput = {
    sectorId,
    status: { notIn: [DemandStatus.CANCELLED] },
  };

  if (options?.mode !== "collaborator" || !options.userId) {
    return base;
  }

  if (options.leaderFullView) {
    return base;
  }

  const userId = options.userId;
  return {
    ...base,
    OR: [
      { assigneeId: userId },
      {
        assignments: {
          some: {
            sectorId,
            status: AssignmentStatus.AVAILABLE,
          },
        },
      },
      {
        assigneeId: null,
        status: DemandStatus.DEMANDED,
      },
    ],
  };
}

function isAvailablePool(d: EnrichedDemand) {
  const assignment = d.assignments[0];
  const status = assignment?.status;
  if (status === AssignmentStatus.AVAILABLE) return true;
  if (!assignment && d.status === DemandStatus.DEMANDED) return true;
  return false;
}

function isMine(d: EnrichedDemand, userId: string) {
  return d.assigneeId === userId;
}

function pushToOperationalColumn(
  grouped: Record<string, EnrichedDemand[]>,
  d: EnrichedDemand,
  assignment: EnrichedDemand["assignments"][0] | undefined
) {
  const status = assignment?.status;

  if (status === AssignmentStatus.AVAILABLE) {
    grouped.available.push(d);
    return;
  }
  if (
    status === AssignmentStatus.IN_PROGRESS ||
    status === AssignmentStatus.ASSIGNED
  ) {
    grouped.production.push(d);
    return;
  }
  if (status === AssignmentStatus.IN_REVIEW) {
    grouped.review.push(d);
    return;
  }
  if (status === AssignmentStatus.ADJUSTMENT) {
    grouped.adjustments.push(d);
    return;
  }
  if (!assignment && d.status === DemandStatus.DEMANDED) {
    grouped.available.push(d);
    return;
  }
  if (!assignment && d.assigneeId) {
    if (d.status === DemandStatus.IN_PRODUCTION) grouped.production.push(d);
    else if (d.status === DemandStatus.IN_REVIEW) grouped.review.push(d);
    else if (d.status === DemandStatus.ADJUSTMENTS) grouped.adjustments.push(d);
  }
}

export async function getSectorBySlug(slug: SectorSlug) {
  return db.sector.findUnique({ where: { slug } });
}

export async function getSectorBoardData(
  slug: SectorSlug,
  rawOptions?: SectorBoardOptions
) {
  const options = normalizeOptions(rawOptions);
  const sector = await getSectorBySlug(slug);
  if (!sector) throw new Error(`Setor ${slug} não encontrado`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const demands = await db.demand.findMany({
    where: buildSectorDemandWhere(sector.id, options),
    include: demandInclude,
    orderBy: [{ priority: { weight: "desc" } }, { dueDate: "asc" }],
  });

  await syncDemandDelays(demands.map((d) => d.id));

  const enriched = demands.map(withTimerPreview);

  const grouped: Record<string, EnrichedDemand[]> = {
    available: [],
    production: [],
    review: [],
    adjustments: [],
    done_today: [],
  };

  const isCollaborator =
    options.mode === "collaborator" &&
    !!options.userId &&
    !options.leaderFullView;
  const userId = options.userId;

  for (const d of enriched) {
    const assignment = d.assignments[0];

    const doneTodayEligible =
      !!d.productionCompletedAt &&
      d.productionCompletedAt >= today &&
      (d.status === DemandStatus.IN_REVIEW || d.status === DemandStatus.DONE);

    if (isCollaborator && userId) {
      if (isAvailablePool(d)) {
        grouped.available.push(d);
        continue;
      }

      if (!isMine(d, userId)) {
        continue;
      }

      if (doneTodayEligible) {
        grouped.done_today.push(d);
      }

      pushToOperationalColumn(grouped, d, assignment);
      continue;
    }

    if (doneTodayEligible) {
      grouped.done_today.push(d);
    }

    pushToOperationalColumn(grouped, d, assignment);
  }

  const top5 = await getTop5ForSector(sector.id);
  let top5Demands = top5
    .map((t) => enriched.find((d) => d.id === t.demandId) ?? null)
    .filter(Boolean) as EnrichedDemand[];

  if (isCollaborator && userId) {
    top5Demands = enriched
      .slice()
      .sort((a, b) => (b.priority?.weight ?? 0) - (a.priority?.weight ?? 0))
      .slice(0, 5);
  }

  const now = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const kpiDemands =
    isCollaborator && userId
      ? enriched.filter((d) => isMine(d, userId))
      : enriched;

  const kpis = {
    priorityCount: top5Demands.length,
    available: grouped.available.length,
    inProduction: grouped.production.length,
    doneToday: grouped.done_today.length,
    doneWeek: kpiDemands.filter(
      (d) => d.productionCompletedAt && d.productionCompletedAt >= weekAgo
    ).length,
    doneMonth: kpiDemands.filter(
      (d) => d.productionCompletedAt && d.productionCompletedAt >= monthAgo
    ).length,
    overdue: kpiDemands.filter(
      (d) =>
        d.dueDate &&
        d.dueDate < now &&
        d.status !== DemandStatus.DONE &&
        d.status !== DemandStatus.CANCELLED
    ).length,
    unassigned: grouped.available.length,
    inReview: grouped.review.length,
    adjustments: grouped.adjustments.length,
  };

  return {
    sector,
    columns: SECTOR_COLUMNS.map((c) => ({ id: c.id, title: c.title })),
    grouped,
    top5: top5Demands,
    kpis,
    calendarDemands: enriched,
  };
}

export async function listSectorUsers(sectorId: string) {
  return db.user.findMany({
    where: { sectorId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
