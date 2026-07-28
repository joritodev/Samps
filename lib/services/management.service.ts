import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import { buildContextWhere } from "@/lib/services/demands.service";
import {
  countDelaysInMonth,
  syncDemandDelays,
} from "@/lib/services/delay.service";

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
  };
}
