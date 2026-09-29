import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import { buildContextWhere } from "@/lib/services/demands.service";
import {
  countDelaysInMonth,
  syncDemandDelays,
} from "@/lib/services/delay.service";
import { FLOW_STAGES, OPEN_EXCLUDED } from "@/lib/agency/demand-filters";

export async function getManagementOverview(user: SessionUser) {
  const where = buildContextWhere(user, "management");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const now = new Date();

  const [
    open,
    overdue,
    doneToday,
    doneWeek,
    doneMonth,
    unassigned,
    inProduction,
    inReview,
    adjustments,
    activeProjects,
    activeTimers,
    shootsMonth,
    awaitingPublication,
  ] = await Promise.all([
    db.demand.count({ where: { ...where, status: { notIn: [DemandStatus.DONE, DemandStatus.CANCELLED, DemandStatus.PUBLISHED] } } }),
    db.demand.count({
      where: {
        ...where,
        status: { notIn: [DemandStatus.DONE, DemandStatus.CANCELLED, DemandStatus.PUBLISHED] },
        dueDate: { lt: now },
      },
    }),
    db.demand.count({
      where: {
        ...where,
        status: { in: [DemandStatus.DONE, DemandStatus.PUBLISHED] },
        updatedAt: { gte: today },
      },
    }),
    db.demand.count({
      where: {
        ...where,
        status: { in: [DemandStatus.DONE, DemandStatus.PUBLISHED] },
        updatedAt: { gte: weekAgo },
      },
    }),
    db.demand.count({
      where: {
        ...where,
        status: { in: [DemandStatus.DONE, DemandStatus.PUBLISHED] },
        updatedAt: { gte: monthAgo },
      },
    }),
    db.demand.count({
      where: {
        ...where,
        assigneeId: null,
        status: { notIn: [DemandStatus.DONE, DemandStatus.CANCELLED] },
      },
    }),
    db.demand.count({ where: { ...where, status: DemandStatus.IN_PRODUCTION } }),
    db.demand.count({ where: { ...where, status: DemandStatus.IN_REVIEW } }),
    db.demand.count({ where: { ...where, status: DemandStatus.ADJUSTMENTS } }),
    db.project.count({ where: { status: "ACTIVE" } }),
    db.workSession.count({ where: { status: "ACTIVE" } }),
    db.shoot.count({
      where: { date: { gte: monthAgo } },
    }),
    db.demand.count({
      where: {
        ...where,
        status: { in: [DemandStatus.APPROVED, DemandStatus.SCHEDULED] },
      },
    }),
  ]);

  const bySector = await db.demand.groupBy({
    by: ["sectorId"],
    where: {
      ...where,
      sectorId: { not: null },
      status: { notIn: [DemandStatus.DONE, DemandStatus.CANCELLED, DemandStatus.PUBLISHED] },
    },
    _count: { _all: true },
  });

  const sectors = await db.sector.findMany({
    where: { slug: { in: ["social", "social-media", "design", "video", "trafego"] } },
    select: { id: true, name: true, slug: true, color: true },
  });

  const sectorStats = sectors.map((s) => ({
    ...s,
    openCount: bySector.find((g) => g.sectorId === s.id)?._count._all ?? 0,
  }));

  const priorityDemands = await db.demand.findMany({
    where: {
      ...where,
      status: { notIn: [DemandStatus.DONE, DemandStatus.CANCELLED, DemandStatus.PUBLISHED] },
    },
    include: {
      client: { select: { id: true, name: true, brandColor: true } },
      assignee: { select: { id: true, name: true } },
      priority: { select: { name: true, color: true, weight: true } },
      sector: { select: { name: true, slug: true } },
    },
    orderBy: [{ priority: { weight: "desc" } }, { dueDate: "asc" }],
    take: 8,
  });

  const [byStatus, byAssignee, overdueByAssignee] = await Promise.all([
    db.demand.groupBy({
      by: ["status"],
      where: { ...where, status: { notIn: OPEN_EXCLUDED } },
      _count: { _all: true },
    }),
    db.demand.groupBy({
      by: ["assigneeId"],
      where: { ...where, assigneeId: { not: null }, status: { notIn: OPEN_EXCLUDED } },
      _count: { _all: true },
    }),
    db.demand.groupBy({
      by: ["assigneeId"],
      where: {
        ...where,
        assigneeId: { not: null },
        status: { notIn: OPEN_EXCLUDED },
        dueDate: { lt: now },
      },
      _count: { _all: true },
    }),
  ]);

  const flow = FLOW_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: byStatus
      .filter((g) => (stage.statuses as readonly DemandStatus[]).includes(g.status))
      .reduce((sum, g) => sum + g._count._all, 0),
  }));

  const assigneeIds = byAssignee.map((g) => g.assigneeId as string);
  const people = assigneeIds.length
    ? await db.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, avatarUrl: true },
      })
    : [];
  const peopleLoad = byAssignee
    .map((g) => {
      const person = people.find((p) => p.id === g.assigneeId);
      return {
        id: g.assigneeId as string,
        name: person?.name ?? "Sem nome",
        avatarUrl: person?.avatarUrl ?? null,
        openCount: g._count._all,
        overdueCount:
          overdueByAssignee.find((o) => o.assigneeId === g.assigneeId)?._count._all ?? 0,
      };
    })
    .sort((a, b) => b.overdueCount - a.overdueCount || b.openCount - a.openCount);

  await syncDemandDelays();

  const delaysThisMonth = await countDelaysInMonth(today);

  return {
    kpis: {
      open,
      overdue,
      doneToday,
      doneWeek,
      doneMonth,
      unassigned,
      inProduction,
      inReview,
      adjustments,
      activeProjects,
      activeTimers,
      shootsMonth,
      awaitingPublication,
      delaysThisMonth,
    },
    sectorStats,
    priorityDemands,
    flow,
    peopleLoad,
  };
}
