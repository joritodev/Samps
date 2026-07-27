import { DemandOrigin, DemandStatus, DemandType } from "@prisma/client";
import { db } from "@/lib/db";
import { getTop5ForSector } from "@/lib/services/priority.service";
import { formatElapsed } from "@/lib/services/work-session.service";
import type { SessionUser } from "@/types/auth";
import { hasPermission } from "@/lib/permissions/resolve";

const demandInclude = {
  client: { select: { id: true, name: true, brandColor: true, socialMediaId: true } },
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

export const SOCIAL_COLUMNS = [
  { id: "demands", title: "Demandas" },
  { id: "projects", title: "Projetos" },
  { id: "extras", title: "Demandas extras" },
  { id: "shoots", title: "Captações" },
  { id: "review", title: "Aguardando revisão" },
  { id: "publication", title: "Aguardando publicação" },
  { id: "done_today", title: "Concluídas hoje" },
] as const;

function socialWhere(user: SessionUser, individual: boolean) {
  const base =
    hasPermission(user.permissions, "clients.view_all") && !individual
      ? {}
      : {
          OR: [
            { assigneeId: user.id },
            { requesterId: user.id },
            { client: { socialMediaId: user.id } },
            { client: { secondarySocialMediaId: user.id } },
            ...(user.clientIds.length ? [{ clientId: { in: user.clientIds } }] : []),
          ],
        };

  return {
    status: { notIn: [DemandStatus.CANCELLED] },
    ...base,
  };
}

export async function getSocialBoardData(
  user: SessionUser,
  options?: { individual?: boolean }
) {
  const individual = !!options?.individual;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const now = new Date();

  const demands = await db.demand.findMany({
    where: socialWhere(user, individual),
    include: demandInclude,
    orderBy: [{ priority: { weight: "desc" } }, { dueDate: "asc" }],
    take: 300,
  });

  const enriched = demands.map(withTimerPreview);

  const grouped: Record<string, typeof enriched> = {
    demands: [],
    projects: [],
    extras: [],
    shoots: [],
    review: [],
    publication: [],
    done_today: [],
  };

  for (const d of enriched) {
    if (
      d.productionCompletedAt &&
      d.productionCompletedAt >= today &&
      (d.status === DemandStatus.DONE ||
        d.status === DemandStatus.PUBLISHED ||
        d.status === DemandStatus.IN_REVIEW)
    ) {
      grouped.done_today.push(d);
    }

    if (d.status === DemandStatus.IN_REVIEW || d.status === DemandStatus.ADJUSTMENTS) {
      grouped.review.push(d);
    } else if (
      d.status === DemandStatus.APPROVED ||
      d.status === DemandStatus.SCHEDULED
    ) {
      grouped.publication.push(d);
    } else if (d.type === DemandType.PROJECT_TASK || d.projectId) {
      grouped.projects.push(d);
    } else if (d.type === DemandType.EXTRA || d.origin === DemandOrigin.MANAGEMENT) {
      grouped.extras.push(d);
    } else if (d.type === DemandType.VIDEO && d.format?.toLowerCase().includes("capta")) {
      grouped.shoots.push(d);
    } else {
      grouped.demands.push(d);
    }
  }

  const top5Scores = await (async () => {
    const socialSector = await db.sector.findFirst({
      where: { OR: [{ slug: "social" }, { slug: "social-media" }] },
      select: { id: true },
    });
    if (!socialSector) return [];
    return getTop5ForSector(socialSector.id);
  })();

  const top5FromScores = top5Scores
    .map((t) => enriched.find((d) => d.id === t.demandId))
    .filter(Boolean) as typeof enriched;

  const top5 =
    top5FromScores.length > 0
      ? top5FromScores
      : enriched
          .slice()
          .sort((a, b) => (b.priority?.weight ?? 0) - (a.priority?.weight ?? 0))
          .slice(0, 5);

  const kpis = {
    priorityCount: top5.length,
    available: grouped.demands.length,
    inProduction: enriched.filter((d) => d.status === DemandStatus.IN_PRODUCTION).length,
    doneToday: grouped.done_today.length,
    doneWeek: enriched.filter(
      (d) =>
        (d.status === DemandStatus.DONE || d.status === DemandStatus.PUBLISHED) &&
        d.updatedAt >= weekAgo
    ).length,
    doneMonth: enriched.filter(
      (d) =>
        (d.status === DemandStatus.DONE || d.status === DemandStatus.PUBLISHED) &&
        d.updatedAt >= monthAgo
    ).length,
    overdue: enriched.filter(
      (d) =>
        d.dueDate &&
        d.dueDate < now &&
        d.status !== DemandStatus.DONE &&
        d.status !== DemandStatus.PUBLISHED
    ).length,
    unassigned: enriched.filter((d) => !d.assigneeId).length,
    inReview: grouped.review.length,
    adjustments: enriched.filter((d) => d.status === DemandStatus.ADJUSTMENTS).length,
    extras: grouped.extras.length,
    awaitingPublication: grouped.publication.length,
  };

  return {
    columns: SOCIAL_COLUMNS.map((c) => ({ id: c.id, title: c.title })),
    grouped,
    top5,
    kpis,
    calendarDemands: enriched,
  };
}

/** Auto-link demand to client's social media (no claim needed) */
export async function linkDemandToClientSocial(demandId: string, clientId: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { socialMediaId: true },
  });
  if (!client?.socialMediaId) return null;

  const demand = await db.demand.findUnique({ where: { id: demandId } });
  if (!demand || demand.assigneeId) return null;

  return db.demand.update({
    where: { id: demandId },
    data: { assigneeId: client.socialMediaId },
  });
}
