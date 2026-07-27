import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type IndicatorPeriod = "today" | "week" | "month";

function periodStart(period: IndicatorPeriod) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - 7);
  if (period === "month") d.setMonth(d.getMonth() - 1);
  return d;
}

/** Aggregated productivity indicators (no separate snapshot table yet) */
export async function getIndicators(params: {
  userId?: string;
  sectorId?: string;
  period?: IndicatorPeriod;
}) {
  const period = params.period ?? "month";
  const from = periodStart(period);
  const where = {
    ...(params.userId ? { assigneeId: params.userId } : {}),
    ...(params.sectorId ? { sectorId: params.sectorId } : {}),
  };

  const [completed, overdue, inProgress, adjustments, sessions] = await Promise.all([
    db.demand.count({
      where: {
        ...where,
        status: { in: [DemandStatus.DONE, DemandStatus.PUBLISHED, DemandStatus.IN_REVIEW] },
        updatedAt: { gte: from },
      },
    }),
    db.demand.count({
      where: {
        ...where,
        status: { notIn: [DemandStatus.DONE, DemandStatus.CANCELLED, DemandStatus.PUBLISHED] },
        dueDate: { lt: new Date() },
      },
    }),
    db.demand.count({
      where: { ...where, status: DemandStatus.IN_PRODUCTION },
    }),
    db.demand.count({
      where: { ...where, status: DemandStatus.ADJUSTMENTS },
    }),
    db.workSession.aggregate({
      where: {
        ...(params.userId ? { userId: params.userId } : {}),
        status: "COMPLETED",
        endedAt: { gte: from },
      },
      _sum: { totalActiveSeconds: true },
      _avg: { totalActiveSeconds: true },
      _count: true,
    }),
  ]);

  return {
    period,
    completed,
    overdue,
    inProgress,
    adjustments,
    sessionsCount: sessions._count,
    totalWorkedSeconds: sessions._sum.totalActiveSeconds ?? 0,
    avgSessionSeconds: Math.round(sessions._avg.totalActiveSeconds ?? 0),
  };
}
