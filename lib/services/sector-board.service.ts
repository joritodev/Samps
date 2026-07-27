import { AssignmentStatus, DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getTop5ForSector } from "@/lib/services/priority.service";
import { formatElapsed } from "@/lib/services/work-session.service";

export type SectorSlug = "design" | "video" | "trafego";

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

export async function getSectorBySlug(slug: SectorSlug) {
  return db.sector.findUnique({ where: { slug } });
}

export async function getSectorBoardData(slug: SectorSlug, options?: { assigneeId?: string }) {
  const sector = await getSectorBySlug(slug);
  if (!sector) throw new Error(`Setor ${slug} não encontrado`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const demands = await db.demand.findMany({
    where: {
      sectorId: sector.id,
      status: { notIn: [DemandStatus.CANCELLED] },
      ...(options?.assigneeId ? { assigneeId: options.assigneeId } : {}),
    },
    include: demandInclude,
    orderBy: [{ priority: { weight: "desc" } }, { dueDate: "asc" }],
  });

  const enriched = demands.map(withTimerPreview);

  const grouped: Record<string, typeof enriched> = {
    available: [],
    production: [],
    review: [],
    adjustments: [],
    done_today: [],
  };

  for (const d of enriched) {
    const assignment = d.assignments[0];
    const status = assignment?.status;

    if (
      d.productionCompletedAt &&
      d.productionCompletedAt >= today &&
      (d.status === DemandStatus.IN_REVIEW || d.status === DemandStatus.DONE)
    ) {
      grouped.done_today.push(d);
    }

    if (status === AssignmentStatus.AVAILABLE) grouped.available.push(d);
    else if (
      status === AssignmentStatus.IN_PROGRESS ||
      status === AssignmentStatus.ASSIGNED
    ) {
      grouped.production.push(d);
    } else if (status === AssignmentStatus.IN_REVIEW) grouped.review.push(d);
    else if (status === AssignmentStatus.ADJUSTMENT) grouped.adjustments.push(d);
    else if (!assignment && d.status === DemandStatus.DEMANDED) {
      grouped.available.push(d);
    }
  }

  const top5 = await getTop5ForSector(sector.id);
  let top5Demands = top5.map((t) => {
    const found = enriched.find((d) => d.id === t.demandId);
    return found ?? null;
  }).filter(Boolean) as typeof enriched;

  if (options?.assigneeId) {
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

  const kpis = {
    priorityCount: top5Demands.length,
    available: grouped.available.length,
    inProduction: grouped.production.length,
    doneToday: grouped.done_today.length,
    doneWeek: enriched.filter(
      (d) => d.productionCompletedAt && d.productionCompletedAt >= weekAgo
    ).length,
    doneMonth: enriched.filter(
      (d) => d.productionCompletedAt && d.productionCompletedAt >= monthAgo
    ).length,
    overdue: enriched.filter(
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
